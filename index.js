const fetch = require('node-fetch');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

const serverKey = 'exampleServerKey'; // Your server key, can be found in private server settings
const baseURL = 'https://api.policeroleplay.community/v1/'; // Base URL, can be found at https://apidocs.policeroleplay.community/for-developers/api-reference
const joinMessage = 'A user with a username starting with "all" has joined: '; // Message to be sent to moderators/admins
const multipleJoinMessage = 'Multiple users with usernames starting with "all" have joined.'; // Message when multiple users join
const cooldownTime = 60; // Cooldown for how often to notify staff members
const minInterval = 1; // Minimum interval in seconds to prevent too frequent checking (DO NOT UPDATE)

let lastNotificationTime = 0;

if (serverKey === 'exampleServerKey') {
  return console.error("You've started the automation for the first time! Please set your server key in line 3 of the script. You can also modify the join message, PRC's base URL, or the cooldown time with lines 4-6.");
}

async function checkJoinLogs() {
  await db.init();

  try {
    const response = await fetch(`${baseURL}server/joinlogs`, {
      headers: { 
        'Server-Key': serverKey
      }
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const joinLogs = await response.json();
    const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
    const rateLimitReset = response.headers.get('X-RateLimit-Reset');

    const playersToNotify = [];

    for (const log of joinLogs) {
      const playerName = log.Player.split(':')[0];
      const playerId = log.Player.split(':')[1];

      if (/^all/i.test(playerName)) {
        const isNotified = await db.get(playerId);
        if (!isNotified) {
          playersToNotify.push(log);
        }
      }
    }

    if (playersToNotify.length > 0) {
      const currentTime = Date.now();
      if (currentTime - lastNotificationTime > (cooldownTime * 1000)) {
        await notifyStaff(playersToNotify, rateLimitRemaining, rateLimitReset);
        lastNotificationTime = currentTime;
      } else {
        console.log("Cooldown in effect. Skipping staff notification.");
      }
    }

    let interval = Math.max(minInterval, Math.floor(60 / rateLimitRemaining));
    console.log(`Next check in ${interval} seconds.`);
    setTimeout(checkJoinLogs, interval * 1000);

  } catch (error) {
    console.error('Error fetching join logs:', error);
    setTimeout(checkJoinLogs, 60 * 1000); // Retry after 60 seconds in case of error
  }
}

async function notifyStaff(players, rateLimitRemaining, rateLimitReset) {
  try {
    const playersResponse = await fetch(`${baseURL}server/players`, {
      headers: { 
        'Server-Key': serverKey
      }
    });

    if (!playersResponse.ok) {
      throw new Error(`Error: ${playersResponse.statusText}`);
    }

    const staff = await playersResponse.json();
    const staffMembers = staff.filter(player => player.Permission.includes("Server Moderator") || player.Permission.includes("Server Administrator") || player.Permission.includes("Server Owner"));

    const playerNames = players.map(player => player.Player.split(':')[0]).join(', ');
    const message = players.length > 1 ? multipleJoinMessage : `${joinMessage}${playerNames}`;

    for (const staffMember of staffMembers) {
      await fetch(`${baseURL}server/command`, {
        method: 'POST',
        headers: { 
          'Server-Key': serverKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          command: `:pm ${staffMember.Name} ${message}`
        })
      });

      if (--rateLimitRemaining <= 1) {
        const resetTime = rateLimitReset * 1000 - Date.now();
        if (resetTime > 0) {
          console.log(`Waiting for ${resetTime} ms due to rate limit.`);
          await new Promise(resolve => setTimeout(resolve, resetTime));
        }
      }
    }

    for (const player of players) {
      const playerId = player.Player.split(':')[1];
      await db.set(playerId, true);
    }
  } catch (playersError) {
    console.error(`Error fetching player list:`, playersError);
  }
}

checkJoinLogs();
