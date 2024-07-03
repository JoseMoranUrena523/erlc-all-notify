import fetch from 'node-fetch';

const serverKey = 'exampleServerKey'; // Your server key, can be found in private server settings
const baseURL = 'https://api.policeroleplay.community/v1/'; // Base URL, can be found at https://apidocs.policeroleplay.community/for-developers/api-reference
const interval = 6; // How often to check join logs (DO NOT CHANGE, RATE LIMIT)
const joinMessage = 'A user with a username starting with "all" has joined: '; // Message to be sent to moderators/admins

if (serverKey === 'exampleServerKey') {
  return console.error("You've started the automation for the first time! Please set your server key in line 3 of index.js. You can also modify the interval, PRC's base URL, or the join message with lines 4-6.");
}

async function checkJoinLogs() {
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

    for (const log of joinLogs) {
      const player = log.Player;
      if (/^all/i.test(player)) {
        const playerName = player.split(':')[0];

        try {
          const playersResponse = await fetch(`${baseURL}server/players`, {
            headers: { 
              'Server-Key': serverKey
            }
          });

          if (!playersResponse.ok) {
            throw new Error(`Error: ${playersResponse.statusText}`);
          }

          const players = await playersResponse.json();

          for (const player of players) {
            const permissions = player.Permission;
            if (permissions.includes("Server Moderator") || permissions.includes("Server Administrator") || permissions.includes("Server Owner")) {
              await fetch(`${baseURL}server/command`, {
                method: 'POST',
                headers: { 
                  'Server-Key': serverKey,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  command: `:pm ${player.Name} ${joinMessage}${playerName}`
                })
              });
            }
          }
        } catch (playersError) {
          console.error(`Error fetching player list:`, playersError);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching join logs:', error);
  }
}

setInterval(checkJoinLogs, interval * 1000);
