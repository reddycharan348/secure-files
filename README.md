# BaluAssociates Portal

A secure multi-company file management portal where administrators can upload, preview, and manage company-specific files with 365-day retention, and companies can log in to view and download their own files.

## Features

- **Role-based Authentication**: Admin and company user roles with different permissions
- **Multi-company Support**: Secure data isolation between companies
- **File Management**: Upload, preview, and download files with automatic expiration
- **Responsive Design**: Works on desktop and mobile devices
- **Security**: Row Level Security (RLS) policies and signed URLs for file access

## Technology Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Functions)
- **Authentication**: Supabase Auth with JWT tokens
- **Storage**: Supabase Storage with private buckets
- **Database**: PostgreSQL with Row Level Security

## Setup Instructions

### 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com) and create a new project
2. Note your project URL and anon key from the project settings

### 2. Configure Database

Run the following SQL in your Supabase SQL editor to create the required tables and policies:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    domain TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create app_users table
CREATE TABLE app_users (
    id UUID PRIMARY KEY, -- matches auth.users.id
    email TEXT,
    role TEXT NOT NULL DEFAULT 'company',
    company_id UUID REFERENCES companies(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create files table
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) NOT NULL,
    filename TEXT NOT NULL,
    path TEXT NOT NULL,
    mime TEXT,
    size BIGINT,
    uploaded_by UUID REFERENCES app_users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for companies table
CREATE POLICY "companies_admin" ON companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM app_users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "companies_company_read" ON companies
    FOR SELECT USING (
        id IN (
            SELECT company_id FROM app_users 
            WHERE id = auth.uid()
        )
    );

-- RLS Policies for app_users table
CREATE POLICY "app_users_self_read" ON app_users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "app_users_admin_update" ON app_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM app_users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for files table
CREATE POLICY "files_admin_access" ON files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM app_users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "files_company_select" ON files
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM app_users 
            WHERE id = auth.uid()
        )
    );

CREATE POLICY "files_company_insert" ON files
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM app_users 
            WHERE id = auth.uid()
        )
    );
```

### 3. Create Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `company-files`
3. Set it to **Private** (not public)
4. Configure the bucket policy to allow authenticated users to access their files

### 4. Configure Application

1. Open `js/config.js`
2. Replace `YOUR_SUPABASE_URL` with your Supabase project URL
3. Replace `YOUR_SUPABASE_ANON_KEY` with your Supabase anon key

### 5. Create Admin User

After setting up the database, create an admin user:

```sql
-- First, register a user through the application or Supabase Auth
-- Then update their role to admin:
INSERT INTO app_users (id, email, role) 
VALUES ('USER_UUID_FROM_AUTH', 'admin@baluassocites.net', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

### 6. Deploy

Deploy the static files to your preferred hosting service:
- **Netlify**: Drag and drop the project folder
- **Vercel**: Connect your Git repository
- **Traditional hosting**: Upload files to your web server

## Usage

### Admin Users

1. **Company Management**: Create and manage companies
2. **File Upload**: Upload files for specific companies
3. **File Management**: Preview, download, and delete files
4. **User Management**: View and manage user accounts

### Company Users

1. **File Access**: View and download files for their company
2. **File Preview**: Preview supported file types (PDF, images)
3. **Secure Downloads**: Download files with temporary signed URLs

## File Types Supported

- **Images**: JPEG, PNG, GIF, WebP, SVG
- **Documents**: PDF, Word, Excel, PowerPoint
- **Text**: Plain text, CSV, JSON, XML
- **Archives**: ZIP, RAR, 7Z

## Security Features

- **Row Level Security**: Database-level data isolation
- **JWT Authentication**: Secure session management
- **Signed URLs**: Temporary file access with expiration
- **HTTPS Enforcement**: Secure data transmission
- **File Validation**: Server-side file type and size validation

## File Retention

- Files automatically expire after 365 days
- Expired files are marked for cleanup
- Optional Edge Function for automated cleanup

## Development

### Project Structure

```
├── index.html              # Main application file
├── css/
│   └── styles.css         # Application styles
├── js/
│   ├── config.js          # Configuration and utilities
│   ├── auth.js            # Authentication management
│   ├── dashboard.js       # Dashboard controller
│   ├── fileManager.js     # File operations
│   ├── companyManager.js  # Company management
│   └── app.js             # Main application logic
└── README.md              # This file
```

### Local Development

1. Clone the repository
2. Configure Supabase credentials in `js/config.js`
3. Serve the files using a local web server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```
4. Open `http://localhost:8000` in your browser

## Environment Variables

For production deployment, you may want to use environment variables:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon key

## Support

For issues and questions, please check the documentation or create an issue in the project repository.

## License

This project is licensed under the MIT License.