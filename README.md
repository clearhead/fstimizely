opthub
======

Sync an Optimizely snippet w/ your local fs and vice versa!

## Installation ##

```bash
npm install -g fstimizely
```

## Hello World ##

```bash
$ cd ~/sandbox/git-repos/ab-tests/text-foo

$ cat ./.fstimizelyrc
{
  "api_token": "abcdefghijklmnopqrstuvwxyz:123456",    // https://www.optimizely.com/tokens
  "experiment_id": "1234567890" // https://www.optimizely.com/edit?experiment_id=123456789
}

$ fstimizely

############ diff of original.js ############
// control code
Write diff to original.js? [Y/n]:

############ diff of variation-1.js ############
// variation 1 code
Write diff to variation-1.js? [Y/n]:

############ diff of global.js ############
// experiment 1234567890's global js
Write diff to global.js? [Y/n]:

############ diff of global.css ############
/* // experiment 1234567890's global css */
Write diff to global.css? [Y/n]:

$ echo '// change' > variation-1.js

$ fstimizely up

############ diff of original.js ############
// control code

############ diff of variation-1.js ############
- // variation 1 code
+ // change
Upload to variation-1.js? [Y/n]:

############ diff of global.js ############
// experiment 1234567890's global js

############ diff of global.css ############
/* // experiment 1234567890's global css */
```

## Authors ##

* Tom Fuertes - [tomfuertes](//github.com/tomfuertes) | [thisbetom](//twitter.com/thisbetom)

## Clearhead? ##

We're an AB Testing Consulting Agency specializing in Optimizely engagements. [We're hiring](http://clearhead.me/#contact-nav)!
