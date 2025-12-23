import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env in the root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupTutorialTasks() {
    console.log('--- Tutorial Data Cleanup ---');
    console.log('Searching for tasks with "tutorial" tag...');

    const { data: tasks, error: fetchError } = await supabase
        .from('tasks')
        .select('id, title, tags')
        .contains('tags', ['tutorial']);

    if (fetchError) {
        console.error('Error fetching tutorial tasks:', fetchError);
        return;
    }

    if (!tasks || tasks.length === 0) {
        console.log('No tutorial tasks found. Everything is clean.');
        return;
    }

    console.log(`Found ${tasks.length} tutorial tasks. Proceeding with deletion...`);

    for (const task of tasks) {
        console.log(`\nDeleting task: "${task.title}" (ID: ${task.id})`);

        // Delete related data first (votes, bids, reviews)
        // These are identified by task_id

        const { error: voteErr } = await supabase.from('task_votes').delete().eq('task_id', task.id);
        if (voteErr) console.error(`  - Failed to delete votes: ${voteErr.message}`);
        else console.log('  - Votes deleted.');

        const { error: bidErr } = await supabase.from('task_bids').delete().eq('task_id', task.id);
        if (bidErr) console.error(`  - Failed to delete bids: ${bidErr.message}`);
        else console.log('  - Bids deleted.');

        const { error: reviewErr } = await supabase.from('task_reviews').delete().eq('task_id', task.id);
        if (reviewErr) console.error(`  - Failed to delete reviews: ${reviewErr.message}`);
        else console.log('  - Reviews deleted.');

        // Delete the task itself
        const { error: taskErr } = await supabase.from('tasks').delete().eq('id', task.id);
        if (taskErr) {
            console.error(`  - Error deleting task record: ${taskErr.message}`);
        } else {
            console.log('  - Task record deleted.');
        }
    }

    console.log('\n--- Cleanup complete ---');
}

cleanupTutorialTasks();
