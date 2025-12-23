"use server";

import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types";
import { sendEmail } from "@/lib/email/sender";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// User client (for public queries)
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Admin client (for fetching user emails)
const supabaseAdmin = supabaseServiceKey
    ? createClient<Database>(supabaseUrl, supabaseServiceKey)
    : null;

export async function fetchNotifications(userId: string, page = 1, limit = 10) {
    if (!userId) return [];
    const normalizedUserId = userId.toLowerCase();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
        const { data, error } = await supabase
            .from('notifications' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .select('*')
            .or(`user_id.eq."${normalizedUserId}",user_id.is.null`)
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) {
            console.error("Error fetching notifications:", error);
            return [];
        }

        return data || [];
    } catch (e) {
        console.error("Unexpected error fetching notifications:", e);
        return [];
    }
}

export async function markAllAsRead(userId: string) {
    if (!userId) return { success: false };

    try {
        const normalizedUserId = userId.toLowerCase();
        // Only mark personal notifications as read in DB
        // For global notifications (user_id is null), we can't easily mark them read per user without a join table.
        // For now, we only update notifications where user_id equals the user's ID.
        // (A more complex system would need a 'notification_reads' table for global messages)
        const { error } = await supabase
            .from('notifications' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .update({ is_read: true } as unknown as never)
            .eq('user_id', normalizedUserId)
            .eq('is_read', false);

        if (error) throw error;
        return { success: true };
    } catch (e) {
        console.error("Error marking all as read:", e);
        return { success: false, error: e };
    }
}

interface CreateNotificationParams {
    userId: string | null; // null for global
    title: string;
    message: string;
    link?: string;
    type?: 'info' | 'success' | 'warning' | 'error';
}

export async function createNotification(params: CreateNotificationParams) {
    try {
        const normalizedUserId = params.userId?.toLowerCase() || null;
        // 1. Insert into DB
        const { data, error } = await supabase
            .from('notifications' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .insert({
                user_id: normalizedUserId,
                title: params.title,
                message: params.message,
                link: params.link,
                type: params.type || 'info',
                is_read: false
            } as unknown as never)
            .select() // Return data so we can confirm insertion
            .single();

        if (error) throw error;

        // 2. Send Email (if specific user and admin client is available)
        if (params.userId && supabaseAdmin) {
            // Fetch user's email from profiles
            const { data: profile } = await supabaseAdmin
                .from('profiles' as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select('email')
                .eq('wallet_address', normalizedUserId as string)
                .single();

            if ((profile as any)?.email) { // eslint-disable-line @typescript-eslint/no-explicit-any
                const subject = `[Juno Link] ${params.title}`;
                const html = `
                    <div style="font-family: sans-serif; color: #333;">
                        <h2>${params.title}</h2>
                        <p>${params.message}</p>
                        ${params.link ? `<p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${params.link}">View in App</a></p>` : ''}
                        <hr />
                        <p style="font-size: 12px; color: #666;">You received this notification because you are a user of Juno Link.</p>
                    </div>
                `;

                // Fire and forget email failure to not block notification response? 
                // Or await it. Awaiting is safer for now.
                try {
                    await sendEmail({
                        to: (profile as any).email, // eslint-disable-line @typescript-eslint/no-explicit-any
                        subject,
                        html
                    });
                } catch (emailErr) {
                    console.error("Failed to send email notification:", emailErr);
                    // Don't fail the whole request, just log it
                }
            }
        }

        return { success: true, data };
    } catch (e) {
        console.error("Error creating notification:", e);
        return { success: false, error: e };
    }
}

