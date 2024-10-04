const dayjs = require('dayjs');


// env vars
const MISSKEY_URL = process.env.MISSKEY_URL
const API_TOKEN = process.env.API_TOKEN
const USER_ID = process.env.USER_ID

if (!MISSKEY_URL || !API_TOKEN || !USER_ID) {
    throw new Error('Missing required environment variables. Please check your .env file')
}

const DRY_RUN = process.env.DRY_RUN === 'true' ? true : false
const INCLUDE_RENOTES = process.env.INCLUDE_RENOTES === 'true' || false
const INCLUDE_REPLIES = process.env.INCLUDE_REPLIES === 'true' || false
const INCLUDE_ATTACHMENTS = process.env.INCLUDE_ATTACHMENTS === 'true' || false
const INCLUDE_POLLS = process.env.INCLUDE_POLLS === 'true' || false
const EXCLUDE_WORDS = process.env.EXCLUDE_WORDS?.split(',') || undefined
const MAX_RENOTES = parseInt(process.env.MAX_RENOTES) || 0
const MAX_REPLIES = parseInt(process.env.MAX_REPLIES) || 0
const MAX_REACTIONS = parseInt(process.env.MAX_REACTIONS) || 0
const DELETE_DAYS= parseInt(process.env.DELETE_DAYS) || 365

if (DRY_RUN) {
    console.log('Dry run mode enabled, no posts will be deleted.')
}


async function postRequest(url, data) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Fetch error: ${error.message}`);
    }
}

async function getOldPosts() {
    try {
        const now = dayjs();
        const threshold = now.subtract(DELETE_DAYS, 'days').unix();

        const response = await postRequest(`https://${MISSKEY_URL}/api/users/notes`, {
            i: API_TOKEN,
            userId: USER_ID,
            withRenotes: INCLUDE_RENOTES,
            withReplies: INCLUDE_REPLIES,
            untilDate: threshold*1000,
            limit: 100,
        });
        console.log(`Found ${response.length} posts matching initial criteria.`)
        let oldPosts = response

        if (MAX_RENOTES> 0) {
            oldPosts = response.filter((post) => post.renoteCount < MAX_RENOTES);
        }
        if (MAX_REPLIES> 0) {
            oldPosts = oldPosts.filter((post) => post.repliesCount < MAX_REPLIES);
        }

        if (MAX_REACTIONS> 0) {
            oldPosts = oldPosts.filter((post) => post.reactionCount < MAX_REACTIONS);
        }

        if (EXCLUDE_WORDS) {
            oldPosts = oldPosts.filter((post) => !EXCLUDE_WORDS.some(word => post?.text?.includes(word)));
        }

        if (!INCLUDE_REPLIES) {
            oldPosts = oldPosts.filter((post) => !post.reply);
        }

        if (!INCLUDE_ATTACHMENTS) {
            oldPosts = oldPosts.filter((post) => post.files.length === 0);
        }

        if (!INCLUDE_POLLS) {
            oldPosts = oldPosts.filter((post) => !post.poll);
        }

        console.log(`Found ${oldPosts.length} posts matching criteria not in the Misskey API Spec.`)

        return oldPosts
    } catch (error) {
        console.error('Error fetching posts:', error.message);
    }
}


async function deletePost(postId) {
    try {
        await postRequest(`https://${MISSKEY_URL}/api/notes/delete`, {
            i: API_TOKEN,
            noteId: postId,
        });
        console.log(`Successfully deleted post: ${postId}`);
    } catch (error) {
        console.error(`Error deleting post ${postId}:`, error.message);
    }
}


async function deleteOldPosts() {
    const oldPosts = await getOldPosts();
    if (!oldPosts || oldPosts.length === 0) {
        console.log(`No posts older than ${DELETE_DAYS} days found.`);
        return;
    }

    for (const post of oldPosts) {
        console.log(`deleting post ${post.id}: ${post.text}`)
        await new Promise(resolve => setTimeout(resolve, 10000));
        if (!DRY_RUN) {
            await deletePost(post.id);
        }
    }
}

deleteOldPosts()