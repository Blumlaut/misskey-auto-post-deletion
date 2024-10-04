# misskey-auto-post-deletion

how to set up:
```bash
git clone https://github.com/Blumlaut/misskey-auto-post-deletion.git
cd misskey-auto-post-deletion
npm i
mv .env.production .env
```

Edit the .env file and fill out all the details or make changes where needed, then start the app by using
```bash
npm run start
```

If you want to double check which posts will be deleted first set `DRY_RUN` envvar to true.


## Obligatory Warnings

This script can only fetch the most recent 100 posts, if any of the criteria cause more than 100 posts to match it will not delete them. If you have a lot of posts that need to be deleted, you may need to run this script multiple times.

This script is ratelimited at 6 req/min, please do not change this delay, be nice to your instance. 

