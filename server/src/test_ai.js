require('dotenv').config();

const testAI = async () => {
    console.log("Testing Claude 3.5 Sonnet via GitHub Models...");
    console.log("Token used:", process.env.GITHUB_TOKEN ? "Found (Starts with " + process.env.GITHUB_TOKEN.substring(0, 7) + ")" : "Not Found!");

    try {
        const response = await fetch("https://models.inference.ai.azure.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`
            },
            body: JSON.stringify({
                messages: [
                    { role: "user", content: "Hi! Can you hear me? Just say 'Yes, I am working!'" }
                ],
                model: "gpt-4o",
                temperature: 0.7,
                max_tokens: 100
            })
        });

        if (!response.ok) {
            const err = await response.json();
            console.error("❌ Error from API:", err);
            return;
        }

        const data = await response.json();
        console.log("✅ Response from Claude:", data.choices[0].message.content);
    } catch (err) {
        console.error("❌ Connection failed:", err.message);
    }
};

testAI();
