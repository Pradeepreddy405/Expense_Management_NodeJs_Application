**How DNS Resolution Works**

DNS stands for Domain Name System. It works like a phone contacts application.

For example, when we want to call someone, we search for their name instead of remembering their mobile number.

Similarly, when we enter a domain name like google.com in a browser, the computer needs to find its corresponding IP address.

First, the browser and operating system check their DNS caches. If the IP address is not available, the request goes to a DNS resolver.

The resolver finds the answer through the DNS hierarchy: Root DNS server, TLD DNS server, and finally the authoritative DNS server.

The authoritative DNS server provides the required DNS record and IP address.

The resolver returns that answer to the client, and the browser connects to the destination server to load the website.

**In simple words: DNS converts human-readable domain names into IP addresses so that computers can communicate with each other.**