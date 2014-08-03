opthub
======

Sync an Optimizely snippet w/ your local fs and vice versa!

## Installation ##

```bash
npm install -g fstimizely
```

## Hello World ##

```bash
$ cd ~/sandbox/git-repos/ab-tests/test-foo

# tokens stored in ~/.fstimizelyrc and mapped via key
#   in local ./.fstimizelyrc to navigate multiple accounts
$ echo 'my_token_ref=1234567890' > .fstimizelyrc
$ echo -e '[tokens]\n  my_token_ref=abcdefghijklmnopqrstuvwxyz:123456' > ~/.fstimizelyrc

# download the experiment!
$ fstimizely

############ diff of original.js ############
// control code

############ diff of variation-1.js ############
// variation 1 code

############ diff of global.js ############
// experiment 1234567890's global js

############ diff of global.css ############
/* // experiment 1234567890's global css */

$ git status --porcelain
?? global.css
?? global.js
?? original.js
?? variation-1.js

# version control or what's the point
$ git add . && git commit -m "downloaded experiment"

# now edit the code, commit, and re-upload!
$ echo '// change' > variation-1.js
$ git add . && git commit -m "changed variation code"
$ fstimizely up

############ diff of original.js ############
// control code

############ diff of variation-1.js ############
- // variation 1 code
+ // change
Upload to variation-1.js? [n/Y]:

############ diff of global.js ############
// experiment 1234567890's global js

############ diff of global.css ############
/* // experiment 1234567890's global css */
```

## Authors ##

* Tom Fuertes - [tomfuertes](//github.com/tomfuertes) | [thisbetom](//twitter.com/thisbetom)

## Clearhead? ##

We're an AB Testing Consulting Agency specializing in Optimizely engagements. [We're hiring](http://clearhead.me/#contact-nav)!
