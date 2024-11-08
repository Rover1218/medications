const User = require('./User');

class Auth {
    static async registerUser(userData) {
        try {
            const user = new User(userData);
            await user.save();
            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    static async loginUser(username, password) {
        try {
            if (!username || !password) {
                return {
                    success: false,
                    error: 'Username and password are required'
                };
            }

            const user = await User.findOne({ username });

            if (!user) {
                return {
                    success: false,
                    error: 'User not found'
                };
            }

            if (user.password !== password) { // Note: In production, use proper password hashing
                return {
                    success: false,
                    error: 'Invalid password'
                };
            }

            return { success: true, user };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = Auth;