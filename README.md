# Bitburner Scripts
Bitburner is a programming based game that focuses on incrementation and automation. In this cyberpunk world you play as a hacker. Your goal is to steal as much money as possible from the various servers of the world. This is done by gaining root access to servers and running viruses on them, which helps you hack more servers, and so on.

There are built in methods to help you write your scripts. Each method costs an amount of memory to run and each server has a max amount of memory. 'Scan' is a method, which takes a parameter - a server's name - and returns an array of servers directly connected to the argument. With scan you can build a map of the city network and start cracking servers. There are over 100 methods that can help you fine tune your scripts.

These are my scripts I've written so far. The main.js module finds all the servers on the network and cracks each one that it is able to crack. The grow.js, weaken.js, and hack.js scripts are then loaded on the servers. A target is then chosen to be hacked by all the cracked servers on the network, as well as all purchased servers (from the purchased-servers.js script). Variables to consider when picking a target are max money and hacking level required, among others.

The script then calculates how many threads are needed for each attack based on calculations about the target server. A specific number of servers are then chosen to run each script the calculated amount of times, based on available memory and memory required. Each attack takes a different amount of time to complete after execution based on the target server's stats. After all scripts are executed the process is started over again.

I'm currently working on timing the attacks better and recursively calling the attack function with predictions of the updated variables and arguments. Theoretically you should be able to get the attacks to trigger within a very small window and have each cycle trigger in sequence, infinitly.
