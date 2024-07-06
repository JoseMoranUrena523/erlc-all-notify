# ER:LC "all" Notify

## Special thanks to those that are using my automation!
[![image](https://github.com/JoseMoranUrena523/erlc-all-notify/assets/87477958/f49aaca3-7c64-4c78-afd4-963f3f1b128c)](https://discord.gg/frcp)

## What is this?
This automation detects when a Roblox user joins your ER:LC private server with a username starting with "all". It then sends staff members a private message letting them know that a username starting with "all" has joined. (interval cannot be updated due to rate limiting set by PRC, hasn't been tested in a private server yet so it can be buggy).

## Why is this useful?
As a former private server moderator myself, I was in a mod call where a user named [allIIIIIII812812](https://www.roblox.com/users/6233238877/profile) was mass RDMing (random deathmatching) in the server. While trying to bring this user to me, I accidentally used commands that affected everyone in the server due to the username "all". This mistake resulted in me being fired from my moderating job. Knowing that others have made the same mistake as me, I made [a automation](https://github.com/JoseMoranUrena523/erlc-all-notify) (with help from [ChatGPT](https://chatgpt.com/)) to monitor join logs and automatically ban users with usernames starting with "all". Next I had an idea to make this one for servers that don't want to be as harsh.

## Installation
### Prerequisites
- A private server with the **ERLC API** server pack.
- A VPS (Virtual Private Server) or any machine with Node.js, Git installed, and a stable internet connection to host this script (e.g., Raspberry Pi or dedicated server).

### Installation Steps
1. `git clone https://github.com/JoseMoranUrena523/erlc-all-notify`
2. `npm install pm2 -g`
3. Edit lines 5 and 7-9 of **index.js**.
4. `npm install`
5. `pm2 start index.js`

Using PM2 makes sure that the script keeps running in the background even if you close the terminal or disconnect from the server. Thank you for using this automation!
