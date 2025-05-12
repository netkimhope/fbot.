const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = async ({ api, font, logger }) => {
    const thin = (txt) => (font.thin ? font.thin(txt) : txt);

    const getThreads = async (types) => {
        try {
            return await api.getThreadList(5, null, types);
        } catch {
            return [];
        }
    };

    const configPath = path.resolve(__dirname, '../kokoro.json');
    let config;
    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (!config || typeof config !== 'object') throw new Error("Invalid configuration file.");
    } catch (error) {
        console.error("Error reading config file:", error);
        return;
    }

    const timezone = config.timezone || "UTC";

    const greetings = {
        morning: ["Good morning! Have a great day!", "Rise and shine! Good morning!"],
        afternoon: ["Good afternoon! Keep up the great work!", "Time to eat something!"],
        evening: ["Good evening! Relax and enjoy your evening!", "Evening! Hope you had a productive day!"],
        night: ["Good night! Rest well!", "Tulog na kayo!"]
    };

    const greetRandom = (timeOfDay) => {
        const list = greetings[timeOfDay] || [];
        return list.length ? list[Math.floor(Math.random() * list.length)] : "Hello!";
    };

    const greetThreads = async (timeOfDay) => {
        try {
            const threads = await getThreads(['INBOX']);
            if (!threads.length) return;

            const msg = greetRandom(timeOfDay);
            for (const thread of threads) {
                logger.instagram("Successfully Sent Greetings to ThreadID: " + thread.threadID);
                if (thread.isGroup) {
                    try {
                        await api.sendMessage(msg, thread.threadID);
                    } catch (error) {
                        await api.deleteThread(thread.threadID);
                    }
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const restart = () => process.exit(0);

    const clearChat = async () => {
        try {
            const threads = await getThreads(['INBOX']);
            if (!threads.length) return;

            for (const thread of threads) {
                if (!thread.isGroup) {
                    await api.deleteThread(thread.threadID);
                    logger.instagram(`Successfully Delete Group Chat History: ${thread.threadID}`);
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const acceptPending = async () => {
        try {
            const pendingThreads = await getThreads(['PENDING', 'OTHER']);
            if (!pendingThreads.length) return;

            for (const thread of pendingThreads) {
                try {
                    await api.sendMessage(thin('📨 Automatically approved by our system.'), thread.threadID);
                    logger.instagram("Successfully Approved ThreadID: " + thread.threadID);
                } catch (error) {
                    await api.deleteThread(thread.threadID);
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const motivation = async () => {
        try {
            const { data: quotes } = await axios.get("https://raw.githubusercontent.com/JamesFT/Database-Quotes-JSON/master/quotes.json");
            if (!Array.isArray(quotes) || !quotes.length) throw new Error("Invalid quotes data.");

            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            const quote = `"${randomQuote.quoteText}"\n\n— ${randomQuote.quoteAuthor || "Anonymous"}`;
            await api.createPost(thin(quote));
            logger.instagram("Successfully Posted Motivational Quotes of BotID: " + api.getCurrentUserID());
        } catch (error) {
            console.error(error);
        }
    };

    const captions = [ 
        ` Hi, everyone im a bot from XN International, feel free to add me in your gc.`,
        ` Hi, everyone im a bot from XN International, feel free to add me in your gc.`,
        ` Hi, everyone im a bot from XN International, feel free to add me in your gc.`
         ];
    
    const promotion = async () => {
        try {
            const caption = captions[Math.floor(Math.random() * captions.length)];
            await api.createPost(caption);
            logger.instagram("Successfully Posted Github Promotion of BotID: " + api.getCurrentUserID());
        } catch (error) {
            console.error('Error creating post:', error);
        }
    };
    
    const schedulePromotion = (times) => {
        times.forEach(time => {
            cron.schedule(time, promotion, {
                timezone: "Asia/Manila"
            });
        });
    };
    
    // Schedule the promotion to post every morning at 8 AM, evening at 6 PM, and night at 10 PM Manila time
    schedulePromotion(['0 8 * * *', '0 18 * *', '0 22 * * *']);

    const scheduleGreetings = (timeOfDay, hours) => {
        if (!greetings[timeOfDay]) {
            console.error(`Invalid time of day: ${timeOfDay}`);
            return;
        }

        hours.forEach((hour) => {
            cron.schedule(`0 ${hour} * * *`, () => greetThreads(timeOfDay), { timezone });
        });
    };

    if (!config.cronJobs || typeof config.cronJobs !== 'object') {
        console.error("Invalid or missing cron jobs configuration.");
        return;
    }

    const taskMap = {
        restart,
        clearChat,
        acceptPending,
        motivation
    };

    Object.entries(config.cronJobs).forEach(([key, job]) => {
        if (!job.enabled) return;
        if (key.endsWith('Greetings')) {
            const timeOfDay = key.replace('Greetings', '').toLowerCase();
            scheduleGreetings(timeOfDay, job.hours || []);
        } else {
            const task = taskMap[key];
            if (task) {
                cron.schedule(job.cronExpression, task, { timezone });
            } else {
                console.error(`Unknown task: ${key}`);
            }
        }
    });
};
