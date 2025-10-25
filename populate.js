const bcrypt = require('bcrypt');
const db = require('./db');

async function populateDatabase() {
    console.log('Starting database population...');
    
    const users = [
        { username: 'john_doe', password: '12345' },
        { username: 'jane_smith', password: '12345' },
        { username: 'mike_wilson', password: '12345' },
        { username: 'sarah_jones', password: '12345' },
        { username: 'alex_brown', password: '12345' }
    ];

    const posts = [
        "Hello everyone! This is my first post.",
        "Just sharing some thoughts today. The weather is nice!",
        "Working on a new project, excited to share updates soon.",
        "Anyone have recommendations for good books to read?",
        "Great discussion happening here, love this community!"
    ];

    try {
        for (const user of users) {
            const hash = await bcrypt.hash(user.password, 10);
            
            db.run(
                `INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`,
                [user.username, hash],
                function(err) {
                    if (err) {
                        console.error(`Error creating user ${user.username}:`, err);
                    } else {
                        console.log(`Created user: ${user.username} (ID: ${this.lastID})`);

                        const userId = this.lastID;
                        posts.forEach((content, index) => {
                            db.run(
                                `INSERT INTO posts (user_id, content) VALUES (?, ?)`,
                                [userId, content],
                                function(err) {
                                    if (err) {
                                        console.error(`Error creating post for ${user.username}:`, err);
                                    } else {
                                        console.log(`Created post ${index + 1} for ${user.username}`);
                                    }
                                }
                            );
                        });
                    }
                }
            );
        }

        console.log('Database population completed!');
        console.log('Created 5 users with 5 posts each (25 total posts)');
        
    } catch (error) {
        console.error('Error populating database:', error);
    }
}

populateDatabase();

setTimeout(() => {
    console.log('Closing database...');
    process.exit(0);
}, 3000);