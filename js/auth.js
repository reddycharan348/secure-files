// Authentication Manager
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authStateCallbacks = [];
    }

    // Initialize authentication state
    async initialize() {
        try {
            // Get current session
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('Error getting session:', error);
                return;
            }

            if (session) {
                await this.handleAuthStateChange(session);
            }

            // Listen for auth state changes
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('Auth state changed:', event, session);
                await this.handleAuthStateChange(session);
            });

        } catch (error) {
            console.error('Error initializing auth:', error);
        }
    }

    // Handle authentication state changes
    async handleAuthStateChange(session) {
        if (session) {
            // User is signed in
            this.currentUser = session.user;
            
            // Get or create user profile
            await this.ensureUserProfile();
            
            // Notify callbacks
            this.authStateCallbacks.forEach(callback => callback(this.currentUser));
            
        } else {
            // User is signed out
            this.currentUser = null;
            this.authStateCallbacks.forEach(callback => callback(null));
        }
    }

    // Ensure user profile exists in app_users table
    async ensureUserProfile() {
        if (!this.currentUser) return;

        try {
            // Check if user profile exists
            const { data: existingUser, error: fetchError } = await supabase
                .from('app_users')
                .select('*')
                .eq('id', this.currentUser.id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('Error fetching user profile:', fetchError);
                return;
            }

            if (!existingUser) {
                // Create user profile
                const { error: insertError } = await supabase
                    .from('app_users')
                    .insert({
                        id: this.currentUser.id,
                        email: this.currentUser.email,
                        role: 'company' // Default role
                    });

                if (insertError) {
                    console.error('Error creating user profile:', insertError);
                }
            }

        } catch (error) {
            console.error('Error ensuring user profile:', error);
        }
    }

    // Sign in with email and password
    async signIn(email, password) {
        try {
            showLoading(true);
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });

            if (error) {
                throw error;
            }

            showSuccess('Successfully signed in!');
            return { success: true, user: data.user };

        } catch (error) {
            console.error('Sign in error:', error);
            showError(error.message || 'Failed to sign in');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }

    // Sign up with email and password
    async signUp(email, password, userData = {}) {
        try {
            showLoading(true);
            
            const { data, error } = await supabase.auth.signUp({
                email: email.trim(),
                password: password,
                options: {
                    data: userData
                }
            });

            if (error) {
                throw error;
            }

            if (data.user && !data.session) {
                showSuccess('Please check your email to confirm your account');
            } else {
                showSuccess('Account created successfully!');
            }

            return { success: true, user: data.user };

        } catch (error) {
            console.error('Sign up error:', error);
            showError(error.message || 'Failed to create account');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }

    // Sign out
    async signOut() {
        try {
            showLoading(true);
            
            const { error } = await supabase.auth.signOut();
            
            if (error) {
                throw error;
            }

            showSuccess('Successfully signed out');
            return { success: true };

        } catch (error) {
            console.error('Sign out error:', error);
            showError(error.message || 'Failed to sign out');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser;
    }

    // Get user profile with role and company info
    async getUserProfile() {
        if (!this.currentUser) return null;

        try {
            const { data, error } = await supabase
                .from('app_users')
                .select(`
                    *,
                    companies (
                        id,
                        name,
                        domain
                    )
                `)
                .eq('id', this.currentUser.id)
                .single();

            if (error) {
                console.error('Error fetching user profile:', error);
                return null;
            }

            return data;

        } catch (error) {
            console.error('Error getting user profile:', error);
            return null;
        }
    }

    // Check if user is admin
    async isAdmin() {
        const profile = await this.getUserProfile();
        return profile?.role === 'admin';
    }

    // Add auth state change callback
    onAuthStateChange(callback) {
        this.authStateCallbacks.push(callback);
        
        // Call immediately if user is already authenticated
        if (this.currentUser) {
            callback(this.currentUser);
        }
    }

    // Remove auth state change callback
    removeAuthStateCallback(callback) {
        const index = this.authStateCallbacks.indexOf(callback);
        if (index > -1) {
            this.authStateCallbacks.splice(index, 1);
        }
    }

    // Reset password
    async resetPassword(email) {
        try {
            showLoading(true);
            
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin
            });

            if (error) {
                throw error;
            }

            showSuccess('Password reset email sent!');
            return { success: true };

        } catch (error) {
            console.error('Reset password error:', error);
            showError(error.message || 'Failed to send reset email');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }

    // Update user profile
    async updateProfile(updates) {
        if (!this.currentUser) return { success: false, error: 'Not authenticated' };

        try {
            showLoading(true);
            
            const { error } = await supabase
                .from('app_users')
                .update(updates)
                .eq('id', this.currentUser.id);

            if (error) {
                throw error;
            }

            showSuccess('Profile updated successfully!');
            return { success: true };

        } catch (error) {
            console.error('Update profile error:', error);
            showError(error.message || 'Failed to update profile');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }
}

// Create global auth manager instance
window.authManager = new AuthManager();