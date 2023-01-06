# bitburner-scripts
Bitburner is a programming based game that focuses on incrementation and automation. In this cyberpunk world you play as a hacker. Your goal is to steal as much money as possible from the various servers in the world. This is done by gaining access to servers and running viruses on them, which helps you hack more servers, and so on.

There are built in methods to help you write your scripts. Each method costs an amount of memory to run and each server has a max amount of memory. 'Scan' is a method, which takes a parameter - a server's name - and returns an array of servers directly connected to the argument. With scan you can build a map of the network. There are over 100 methods that help you fine tune your scripts.

These are my scripts I've written so far. The main module finds all the servers on the network and cracks each one that it is able to crack. The grow, weaken, and hack scripts are then loaded on the servers. A target is then chosen to be hacked by all the cracked servers on the network, as well as all purchased servers. Variables to consider when picking a target are max money and hacking level required.

The script then calculates how many threads are needed for each attack to maximize the amount of money stolen. Servers are then chosen to run each script the calculated amount of times. Each type of attack takes a different amount of time based on what type and the target server's stats. After all scripts are executed the process is started over again.

I'm currently working on timing the attacks better and recursively calling the attack function with predictions of the updated variables and arguments. Theoretically you should be able to get the attacks to trigger within a very small window and have each cycle trigger in sequence, infinitly.
