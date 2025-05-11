const devs = require(__dirname.replace("/script", "") + '/system/api');

module.exports["config"] = {
  name: "teach",
  version: "1.0.0",
  role: 1, // Set a role level to restrict teaching to authorized users
  aliases: ["Teach"],
  credits: "cliff", // API by mark & modify
  info: "Teach the bot new responses",
  cd: 0
};

module.exports["run"] = async function({ api, event, args }) {
  const axios = require("axios");
  let { messageID, threadID, senderID } = event;
  let tid = threadID,
      mid = messageID;

  // Check if the user provided input in the correct format
  if (args.length < 3) return api.sendMessage("Usage: teach <trigger> | <response>", tid, mid);

  // Split the input into trigger and response
  const input = args.join(" ").split("|").map(item => item.trim());
  if (input.length !== 2) return api.sendMessage("Usage: teach <trigger> | <response>", tid, mid);

  const [trigger, response] = input;

  try {
    // Send the teaching data to the API
    const res = await axios.post(`${devs.markdevs69}/teach`, {
      trigger: encodeURIComponent(trigger),
      response: encodeURIComponent(response),
    });

    if (res.data.error) {
      api.sendMessage(`Error: ${res.data.error}`, tid, (error, info) => {
        if (error) {
          console.error(error);
        }
      }, mid);
    } else {
      api.sendMessage("Successfully taught the bot!", tid, (error, info) => {
        if (error) {
          console.error(error);
        }
      }, mid);
    }
  } catch (error) {
    console.error(error);
    api.sendMessage("An error occurred while teaching the bot.", tid, mid);
  }
};