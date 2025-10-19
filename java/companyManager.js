// Company Manager
class CompanyManager {
    constructor() {
        this.companies = [];
    }

    // Initialize company manager
    initialize() {
        this.setupEventListeners();
    }

    // Set up event listeners
    setupEventListeners() {
        const companyForm = document.getElementById('company-form');
        if (companyForm) {
            companyForm.addEventListener('submit', (e) => this.handleCreateCompany(e));
        }
    }

    // Handle create company form submission
    async handleCreateCompany(e) {
        e.preventDefault();
        
        const nameInput = document.getElementById('company-name');
        const domainInput = document.getElementById('company-domain');
        
        const name = nameInput?.value?.trim();
        const domain = domainInput?.value?.trim();
        
        if (!name) {
            showError('Company name is required');
            return;
        }
        
        const companyData = { name };
        if (domain) {
            companyData.domain = domain;
        }
        
        const result = await this.createCompany(companyData);
        
        if (result.success) {
            // Clear form
            if (nameInput) nameInput.value = '';
            if (domainInput) domainInput.value = '';
            
            // Reload companies
            await this.loadCompaniesForManagement();
            await dashboardController.loadCompaniesForAdmin();
        }
    }

    // Create new company
    async createCompany(companyData) {
        try {
            showLoading(true);
            
            const { data, error } = await supabase
                .from('companies')
                .insert(companyData)
                .select()
                .single();
            
            if (error) {
                throw error;
            }
            
            showSuccess('Company created successfully');
            return { success: true, company: data };
            
        } catch (error) {
            console.error('Error creating company:', error);
            showError(error.message || 'Failed to create company');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }

    // Get all companies
    async getCompanies() {
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .order('name');
            
            if (error) {
                throw error;
            }
            
            this.companies = data || [];
            return this.companies;
            
        } catch (error) {
            console.error('Error getting companies:', error);
            return [];
        }
    }

    // Update company
    async updateCompany(id, updates) {
        try {
            showLoading(true);
            
            const { data, error } = await supabase
                .from('companies')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            
            if (error) {
                throw error;
            }
            
            showSuccess('Company updated successfully');
            return { success: true, company: data };
            
        } catch (error) {
            console.error('Error updating company:', error);
            showError(error.message || 'Failed to update company');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }

    // Delete company
    async deleteCompany(id) {
        try {
            showLoading(true);
            
            // Check if company has files
            const { data: files, error: filesError } = await supabase
                .from('files')
                .select('id')
                .eq('company_id', id)
                .limit(1);
            
            if (filesError) {
                throw filesError;
            }
            
            if (files && files.length > 0) {
                showError('Cannot delete company with existing files. Please delete all files first.');
                return { success: false, error: 'Company has existing files' };
            }
            
            // Check if company has users
            const { data: users, error: usersError } = await supabase
                .from('app_users')
                .select('id')
                .eq('company_id', id)
                .limit(1);
            
            if (usersError) {
                throw usersError;
            }
            
            if (users && users.length > 0) {
                showError('Cannot delete company with existing users. Please reassign or delete users first.');
                return { success: false, error: 'Company has existing users' };
            }
            
            // Delete company
            const { error } = await supabase
                .from('companies')
                .delete()
                .eq('id', id);
            
            if (error) {
                throw error;
            }
            
            showSuccess('Company deleted successfully');
            return { success: true };
            
        } catch (error) {
            console.error('Error deleting company:', error);
            showError(error.message || 'Failed to delete company');
            return { success: false, error: error.message };
        } finally {
            showLoading(false);
        }
    }

    // Load companies for management interface
    async loadCompaniesForManagement() {
        try {
            const companies = await this.getCompanies();
            this.displayCompaniesForManagement(companies);
        } catch (error) {
            console.error('Error loading companies for management:', error);
        }
    }

    // Display companies in management interface
    displayCompaniesForManagement(companies) {
        const container = document.getElementById('companies-list');
        if (!container) return;
        
        if (companies.length === 0) {
            container.innerHTML = '<p class="text-gray-500">No companies found</p>';
            return;
        }
        
        container.innerHTML = companies.map(company => `
            <div class="company-item" data-company-id="${company.id}">
                <div class="company-info">
                    <h5>${company.name}</h5>
                    <p>${company.domain || 'No domain specified'}</p>
                    <small>Created: ${formatDate(company.created_at)}</small>
                </div>
                <div class="company-actions">
                    <button class="btn btn-secondary" onclick="companyManager.editCompany('${company.id}')">
                        Edit
                    </button>
                    <button class="btn btn-secondary" onclick="companyManager.confirmDeleteCompany('${company.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Edit company (inline editing)
    async editCompany(id) {
        const company = this.companies.find(c => c.id === id);
        if (!company) return;
        
        const companyItem = document.querySelector(`[data-company-id="${id}"]`);
        if (!companyItem) return;
        
        const companyInfo = companyItem.querySelector('.company-info');
        if (!companyInfo) return;
        
        // Create edit form
        const editForm = document.createElement('form');
        editForm.className = 'edit-company-form';
        editForm.innerHTML = `
            <div class="form-group">
                <input type="text" id="edit-name-${id}" value="${company.name}" required>
            </div>
            <div class="form-group">
                <input type="text" id="edit-domain-${id}" value="${company.domain || ''}" placeholder="Domain (optional)">
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary">Save</button>
                <button type="button" class="btn btn-secondary" onclick="companyManager.cancelEdit('${id}')">Cancel</button>
            </div>
        `;
        
        // Handle form submission
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById(`edit-name-${id}`).value.trim();
            const domain = document.getElementById(`edit-domain-${id}`).value.trim();
            
            if (!name) {
                showError('Company name is required');
                return;
            }
            
            const updates = { name };
            if (domain) {
                updates.domain = domain;
            }
            
            const result = await this.updateCompany(id, updates);
            if (result.success) {
                await this.loadCompaniesForManagement();
                await dashboardController.loadCompaniesForAdmin();
            }
        });
        
        // Replace company info with edit form
        companyInfo.style.display = 'none';
        companyItem.appendChild(editForm);
    }

    // Cancel edit
    cancelEdit(id) {
        const companyItem = document.querySelector(`[data-company-id="${id}"]`);
        if (!companyItem) return;
        
        const companyInfo = companyItem.querySelector('.company-info');
        const editForm = companyItem.querySelector('.edit-company-form');
        
        if (companyInfo) companyInfo.style.display = 'block';
        if (editForm) editForm.remove();
    }

    // Confirm delete company
    async confirmDeleteCompany(id) {
        const company = this.companies.find(c => c.id === id);
        if (!company) return;
        
        const confirmed = confirm(`Are you sure you want to delete "${company.name}"?\n\nThis action cannot be undone.`);
        if (!confirmed) return;
        
        const result = await this.deleteCompany(id);
        if (result.success) {
            await this.loadCompaniesForManagement();
            await dashboardController.loadCompaniesForAdmin();
        }
    }

    // Get company by ID
    async getCompanyById(id) {
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) {
                throw error;
            }
            
            return data;
            
        } catch (error) {
            console.error('Error getting company by ID:', error);
            return null;
        }
    }

    // Get companies with file counts
    async getCompaniesWithStats() {
        try {
            const { data, error } = await supabase
                .from('companies')
                .select(`
                    *,
                    files (count)
                `)
                .order('name');
            
            if (error) {
                throw error;
            }
            
            return data || [];
            
        } catch (error) {
            console.error('Error getting companies with stats:', error);
            return [];
        }
    }

    // Search companies
    async searchCompanies(query) {
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .or(`name.ilike.%${query}%,domain.ilike.%${query}%`)
                .order('name');
            
            if (error) {
                throw error;
            }
            
            return data || [];
            
        } catch (error) {
            console.error('Error searching companies:', error);
            return [];
        }
    }

    // Validate company data
    validateCompanyData(data) {
        const errors = [];
        
        if (!data.name || data.name.trim().length === 0) {
            errors.push('Company name is required');
        }
        
        if (data.name && data.name.trim().length > 100) {
            errors.push('Company name must be less than 100 characters');
        }
        
        if (data.domain && data.domain.trim().length > 100) {
            errors.push('Domain must be less than 100 characters');
        }
        
        // Basic domain validation
        if (data.domain && data.domain.trim()) {
            const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
            if (!domainRegex.test(data.domain.trim())) {
                errors.push('Please enter a valid domain name');
            }
        }
        
        return errors;
    }

    // Bulk operations
    async bulkDeleteCompanies(companyIds) {
        const results = [];
        
        for (const id of companyIds) {
            const result = await this.deleteCompany(id);
            results.push({ id, ...result });
        }
        
        return results;
    }

    // Export companies data
    async exportCompanies() {
        try {
            const companies = await this.getCompaniesWithStats();
            
            const csvContent = [
                ['Name', 'Domain', 'Created At', 'File Count'],
                ...companies.map(company => [
                    company.name,
                    company.domain || '',
                    new Date(company.created_at).toLocaleDateString(),
                    company.files?.[0]?.count || 0
                ])
            ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `companies-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error('Error exporting companies:', error);
            showError('Failed to export companies');
        }
    }
}

// Create global company manager instance
window.companyManager = new CompanyManager();