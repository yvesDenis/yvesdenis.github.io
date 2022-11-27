---
date: 2022-11-26T23:20:08-04:00
tags: ["Golang" , "Cli"]
title: "Building a Command line application in Golang"
toc: true
featured_image: "/images/golang_logo.png"
---

## Introduction

Command Line Applications(CLI) are computer programs designed to be used
from a text-based interface such as Shell or Bash. They are useful as 
they allow users to type in commands that can produce immediate results or 
give them the possibility to automate tasks. An example of a CLI tool:
**Git, Brew, Curl, etc...**  

I'm a CLI lover as are almost all developers :)
The feeling of working with the terminal gives you the sensation to be 
a Hacker *(like the hoodie guy in the movies hidden in the dark and playing
with his keyboard)*   

![Hoodie guy behind the terminal](/images/hoodie_guy_terminal.jpeg)


The source code of this article : https://github.com/yvesDenis/website-projects-articles/tree/master/crypto

Functional requirements:
1. Our app should show a help text describing its functionality.
2. Our app should encrypt an input text
3. Our app should decrypt an input text
4. If anything goes wrong in the process we must receive a generic error message.

## Let's dive in folks!

### What is Cryptography?

First, let's take a break from the principle of [Cryptography](https://en.wikipedia.org/wiki/Cryptography).
This could be a topic of a whole article but I'll be synthetic saying that it's a mechanism 
by which data is converted into a kind of secret code hiding its real meaning.
That data transformation can be done with a [single key](https://en.wikipedia.org/wiki/Symmetric-key_algorithm) (Symmetric key encryption scheme) or with a [public and private keys](https://en.wikipedia.org/wiki/Public-key_cryptography) (Asymmetric key encryption scheme).

For this tutorial, i choosed the first option with an [AES-256 Cypher algorithm](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)

### Urfave/cli Golang library

There are many Golang libraries or frameworks which we can leverage to build our CLI app but 
[Urfave/cli](https://cli.urfave.org) is my favorite as I find it simple, fast and not restrictive like the others.
I has 2 versions and we'll go with the second and latest one [v2](https://cli.urfave.org/v2/getting-started/).

For Go beginners, here's the official doc https://go.dev/doc/

First, create our new cli-app directory and our cli-example/app module:

```
mkdir cli-app
go mod init cli-example/app

```

Following these instructions will result in a go.mod file which contains the indication of the module and the go version module crypto-example/encryption

```
module cli-example/app

go 1.18

```

Let's move inside the cli-app directory and create our app.go file:

```
-> cd cli-app
-> touch app.go

package main

import (
	"os"

	"github.com/urfave/cli/v2"
)
func  main()  {
	(&cli.App{}).Run(os.Args)
}
```

This is the base application, it'll run and show this help text, nothing more though:

```
-> go go get github.com/urfave/cli
-> go run .
NAME:
   main.exe - A new cli application
USAGE:
   main.exe [global options] command [command options] [arguments...]

COMMANDS:
   help, h  Shows a list of commands or help for one command

GLOBAL OPTIONS:
   --help, -h  show help

```

Ok , that's good but nothing fancy! We want something sophisticated right?, that's why
we made this [encrytion.go](https://github.com/yvesDenis/website-projects-articles/blob/master/crypto/crypto-example/encryption.go) file, inside there's all the encryption/decryption logic but don't be in a hurry, we'll get there later
:wink:

CLI apps do have commands which actually invoke actions and flags or options which customize command's execution.
This article explains well this concepts above: https://blog.heroku.com/cli-flags-get-started-with-oclif 

So as a summary:

- Flags are key-value pairs that are added after the command name while running the command.
- Commands are actions executed (functions called).

#### Commands

For our use-case , commands are effective encryption and decryption actions:

{{< gist yvesDenis 1f6c937ffa06771deb58f8b11b01e18b >}}

- Lines 3 and 16: Name of commands.
- Lines 4 and 17: Name of aliases , like shortcuts: -e for encrypt, -d for decrypt.
- Lines 9 and 22: Error message returned is anything goes wrong.
- Lines 11 and 24: Message output, values returned by the app ,plainText in case of decryption and cypherText
fo the message encryption.

Like said before, the cryptography opration is implemented in another file For readability purposes, to import 
the encryption.go file and synchronize modules's dependencies, you should edit the go.mod file 
with thes instructions:

```
go mod edit -replace crypto-example/encryption => ../crypto-example
go mod tidy 
```

- Lines 7-8: Encryption action:

```

func Encrypt(textToEncrypt string, secretKey string) (string, error) {
	//The key argument should be the AES key, either 16, 24, or 32 bytes to select AES-128, AES-192, or AES-256.
	block, err := createNewCypher(secretKey)
	if err != nil {
		return "", err
	}

	plainText := []byte(textToEncrypt)
	//returns a BlockMode which encrypts in cipher block chaining mode, using the given Block.
	cfbEncrypter := cipher.NewCFBEncrypter(block, bytes)

	cipherText := make([]byte, len(plainText))
	cfbEncrypter.XORKeyStream(cipherText, plainText)

	return encode(cipherText), nil
}
```

- Lines 79-20: Decryption action:

```

func Decrypt(textToDecrypt string, secretKey string) (string, error) {

	block, err := createNewCypher(secretKey)
	if err != nil {
		return "", err
	}

	cipherText, err := decode(textToDecrypt)
	if err != nil {
		return "", err
	}
	cfbDecrypter := cipher.NewCFBDecrypter(block, bytes)

	plainText := make([]byte, len(cipherText))
	cfbDecrypter.XORKeyStream(plainText, cipherText)

	return string(plainText), nil
}
```

#### Flags

{{< gist yvesDenis 78d06db450fd6f96783c3a32205d381f >}}

- Lines 3 and 9: Flags names. -key for the symmetric key and -text for the text
- Lines 4 and 10: Aliases. -k and -t.
- Lines 5 and 11: Flags decrptions , visible in the help text.
- Lines 6 and 12: Initialize key and text variables with input arguments.

#### Run the app

Afetr adding this last instruction:

{{< gist yvesDenis ab71d9af62939b8ea3f1531d67877687 >}}

The app is ready to be launched, but before we should build it :

``-> go build .``

... it'll generate an executable named app. To output the new help message:

```

-> app 
NAME:
   crypto-cli - Command line interface for encryption and decryption

USAGE:
   crypto-cli [global options] command [command options] [arguments...]

VERSION:
   v1.0

COMMANDS:
   encrypt, e  encrypt a text
   decrypt, d  decrypt a text
   help, h     Shows a list of commands or help for one command

GLOBAL OPTIONS:
   --key value, -k value   (Required)-Cypher key used for encryption/decryption, It's length should be a multiple of 16
   --text value, -t value  (Required)-Text to encrypt/decrypt
   --help, -h              show help (default: false)
   --version, -v           print the version (default: false)

```

Let's try to validate our functional requirements. Encrypt a text with a key(its length must be multiple of 16):

```
-> app -k "passphrase123456" -t "Encrypting example" encrypt
O5I/eiCXTEnOGa5OiRo8fsRp
```

Let's decrypt the previous generated cyphertext with the same key:

```
-> app -k "passphrase123456" -t "O5I/eiCXTEnOGa5OiRo8fsRp" decrypt
Encrypting example.
```

Awesome!! We successfully implemented a CLI app with Golang! 

## Conclusion

CLI implementation is not tied to any particular programming language. There are many examples out there with js, ruby, etc...  

I've been doing side projects in Golang for a while now and absolutely fell in love with it.

I use the terminal on a daily basis and I honestly think that mastering the terminal is a must for any developer! 

![You should master the terminal!](/images/master_terminal.jpeg) 




