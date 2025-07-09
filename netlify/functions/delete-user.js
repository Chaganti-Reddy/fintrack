import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { user_id } = JSON.parse(event.body);

    if (!user_id) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing user_id' }) };
    }

    try {
        // 1. Delete profile picture
        const filePath = `${user_id}/${user_id}/profile-picture.png`;
        await supabase.storage.from('profile-pictures').remove([filePath]);

        // 2. Delete all transactions
        await supabase.from('transactions').delete().eq('user_id', user_id);

        // 3. Delete all goals
        await supabase.from('goals').delete().eq('user_id', user_id);

        // 4. Finally, delete the user
        const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user_id);
        if (deleteUserError) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: deleteUserError.message }),
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'User and all data deleted successfully' }),
        };
    } catch (err) {
        console.error('Unexpected error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Something went wrong' }),
        };
    }
}
