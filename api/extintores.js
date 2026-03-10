// Vercel Serverless Function Proxy for Extintores App
// This runs on Vercel's backend, hiding the true Google Form/Script URL.

export const maxDuration = 60; // Allows up to 60s of execution on Vercel Hobby

export default async function handler(req, res) {
    // 1. Enable CORS for local development / your specific domain
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*') // Restrict in production
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    // 2. We use ENV variable or fallback to the known script for now.
    const SCRIPT_URL = process.env.GAS_URL || 'https://script.google.com/macros/s/AKfycbwUnyQ0QmPQiMvhNu6r5u66MR8ilMl5KDPbHoTtlX1iTm0gt_u4B6POw3CwiOO40m5poA/exec';

    try {
        // Enforce POST
        if (req.method !== 'POST') {
            return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
        }

        const bodyData = req.body;

        // 3. Forward request to Google Apps Script
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData)
        });

        const data = await response.json();

        // 4. Apply Cache-Control for reading (get_current_state)
        // This tells Vercel's CDN to cache the response for 30 seconds
        if (bodyData && bodyData.action === 'get_current_state') {
            res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=59');
        } else {
            // For writes (alta, baja, remito), do not cache
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }
}
