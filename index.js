const fetch = require('node-fetch');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

const serverKey = 'exampleServerKey'; // Your server key, can be found in private server settings
const baseURL = 'https://api.policeroleplay.community/v1/'; // Base URL, can be found in https://apidocs.policeroleplay.community/for-developers/api-reference
const joinMessage = 'A user with a username starting with "all" or "others" have joined: '; // Message to be sent to moderators/admins
const multipleJoinMessage = 'Multiple users with usernames starting with "all" or "others" have joined.'; // Message when multiple users join
const cooldownTime = 60; // Cooldown for how often to notify staff members

let lastNotificationTime = 0;

if (serverKey === 'exampleServerKey') {
  return console.error("You've started the automation for the first time! Please set your server key in line 3 of the script.");
}

async function fetchJoinLogs() {
  try {
    const response = await fetch(`${baseURL}server/joinlogs`, {
      headers: { 
        'Server-Key': serverKey
      }
    });

    if (response.status === 422) {
      throw new Error("Private server is shut down (there are no players), unable to proceed with automation.");
    }
    
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const joinLogs = await response.json();
    const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
    const rateLimitReset = response.headers.get('X-RateLimit-Reset');
    return { joinLogs, rateLimitRemaining, rateLimitReset };
  } catch (error) {
    console.error('Error fetching join logs:', error);
    throw error;
  }
}

async function fetchPlayers() {
  try {
    const response = await fetch(`${baseURL}server/players`, {
      headers: { 
        'Server-Key': serverKey
      }
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const players = await response.json();
    const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
    const rateLimitReset = response.headers.get('X-RateLimit-Reset');
    return { players, rateLimitRemaining, rateLimitReset };
  } catch (error) {
    console.error('Error fetching players:', error);
    throw error;
  }
}

async function sendCommand(command) {
  try {
    const response = await fetch(`${baseURL}server/command`, {
      method: 'POST',
      headers: {
        'Server-Key': serverKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command })
    });

    if (!response.ok) {
      throw new Error(`Error executing command: ${response.statusText}`);
    }

    const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
    const rateLimitReset = response.headers.get('X-RateLimit-Reset');
    return { rateLimitRemaining, rateLimitReset };
  } catch (error) {
    console.error(`Error executing command "${command}":`, error);
    throw error;
  }
}

async function notifyStaff(players) {
  try {
    const { players: staff, rateLimitReset: rateLimitReset1 } = await fetchPlayers();
    const resetTime1 = (parseInt(rateLimitReset1, 10) * 1000) - Date.now() + 1000;
    await new Promise(resolve => setTimeout(resolve, resetTime1));

    const staffMembers = staff.filter(player => player.Permission.includes("Server Moderator") || player.Permission.includes("Server Administrator") || player.Permission.includes("Server Owner"));

    const newPlayers = [];
    for (const player of players) {
      const playerId = player.Player.split(':')[1];
      const exists = await db.get(playerId);
      if (!exists) {
        newPlayers.push(player);
      }
    }

    if (newPlayers.length > 0) {
      const playerNames = newPlayers.map(player => player.Player.split(':')[0]).join(', ');
      const message = newPlayers.length > 1 ? multipleJoinMessage : `${joinMessage}${playerNames}`;

      for (const staffMember of staffMembers) {
        const { rateLimitReset: rateLimitReset2 } = await sendCommand(`:pm ${staffMember.Player.split(':')[0]} ${message}`);
        const resetTime = (parseInt(rateLimitReset2, 10) * 1000) - Date.now() + 1000;
        await new Promise(resolve => setTimeout(resolve, resetTime));
      }

      for (const player of newPlayers) {
        const playerId = player.Player.split(':')[1];
        await db.set(playerId, true);
      }
    } else {
      console.log("No new players to notify.");
    }
  } catch (playersError) {
    console.error(`Error notifying staff:`, playersError);
  }
}

async function checkJoinLogs() {
  await db.init();

  try {
    const { joinLogs, rateLimitReset: rateLimitReset1 } = await fetchJoinLogs();
    const resetTime1 = (parseInt(rateLimitReset1, 10) * 1000) - Date.now() + 1000;

    await new Promise(resolve => setTimeout(resolve, resetTime1));

    const playersToNotify = joinLogs.filter(log => {
      const playerName = log.Player.split(':')[0];
      return /^(all|others)/i.test(playerName);
    });

    if (playersToNotify.length > 0) {
      const currentTime = Date.now();
      if (currentTime - lastNotificationTime > (cooldownTime * 1000)) {
        await notifyStaff(playersToNotify);
        lastNotificationTime = currentTime;
      } else {
        console.log("Cooldown in effect. Skipping staff notification.");
      }
    }

    checkJoinLogs();

  } catch (error) {
    console.error('Error in checkJoinLogs:', error);
    setTimeout(checkJoinLogs, 30 * 1000);
  }
}

checkJoinLogs();
