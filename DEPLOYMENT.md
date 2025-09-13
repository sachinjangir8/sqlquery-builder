# Deployment Guide for Vercel

This guide will help you deploy your SQL Custom Command application to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. MongoDB Atlas account (for production database)
3. Git repository (GitHub, GitLab, or Bitbucket)

## Environment Variables Setup

Before deploying, you need to set up the following environment variables in Vercel:

### Required Environment Variables

1. **MONGODB_URI**: Your MongoDB connection string

   - For MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/sqlbuilder`
   - Example: `mongodb+srv://myuser:mypassword@cluster0.abc123.mongodb.net/sqlbuilder`

2. **SESSION_SECRET**: A secure random string for session encryption
   - Generate a strong secret: `openssl rand -base64 32`
   - Example: `your-super-secret-session-key-here`

### Optional Environment Variables

3. **GOOGLE_CLIENT_ID**: Google OAuth Client ID (if using Google login)
4. **GOOGLE_CLIENT_SECRET**: Google OAuth Client Secret (if using Google login)
5. **NODE_ENV**: Set to `production` (automatically set by Vercel)

## Deployment Steps

### 1. Prepare Your Repository

Make sure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket).

### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your Git repository
4. Vercel will automatically detect the configuration from `vercel.json`

### 3. Configure Environment Variables

1. In your Vercel project dashboard, go to "Settings" → "Environment Variables"
2. Add each environment variable:
   - **MONGODB_URI**: Your MongoDB connection string
   - **SESSION_SECRET**: Your secure session secret
   - **GOOGLE_CLIENT_ID**: (if using Google OAuth)
   - **GOOGLE_CLIENT_SECRET**: (if using Google OAuth)

### 4. Deploy

1. Click "Deploy" in Vercel
2. Vercel will automatically:
   - Build the client (React app)
   - Deploy the server (Node.js API)
   - Configure routing

### 5. Verify Deployment

1. Once deployed, visit your Vercel URL
2. Test the application functionality:
   - User registration/login
   - File upload
   - SQL query building
   - Data insights

## Project Structure for Vercel

The deployment uses the following structure:

```
├── vercel.json          # Vercel configuration
├── client/              # React frontend
│   ├── package.json
│   ├── vite.config.js
│   └── src/
├── server/              # Node.js backend
│   ├── package.json
│   └── src/
└── DEPLOYMENT.md        # This file
```

## Build Process

Vercel will automatically:

1. **Build Client**: Run `npm run build` in the `client/` directory
2. **Deploy Server**: Use the server code directly (no build needed)
3. **Configure Routing**: Route `/api/*` to server, everything else to client

## Troubleshooting

### Common Issues

1. **Build Failures**:

   - Check that all dependencies are in `package.json`
   - Ensure Node.js version compatibility

2. **Database Connection Issues**:

   - Verify MongoDB URI is correct
   - Check MongoDB Atlas IP whitelist (add `0.0.0.0/0` for Vercel)

3. **Environment Variables**:

   - Ensure all required variables are set in Vercel dashboard
   - Check variable names match exactly (case-sensitive)

4. **CORS Issues**:
   - The server is configured to allow all origins in production
   - If issues persist, check the CORS configuration in `server/src/index.js`

### Logs and Debugging

1. Check Vercel function logs in the dashboard
2. Use `console.log` statements in your server code for debugging
3. Check MongoDB Atlas logs for database connection issues

## Security Considerations

1. **Session Secret**: Use a strong, random session secret
2. **MongoDB**: Use MongoDB Atlas with proper authentication
3. **Environment Variables**: Never commit sensitive data to Git
4. **CORS**: The current configuration allows all origins - consider restricting in production

## Performance Optimization

1. **Database Indexing**: Add indexes to frequently queried fields
2. **File Upload Limits**: Current limit is 10MB - adjust as needed
3. **Session Storage**: Consider using Redis for session storage in high-traffic scenarios

## Support

If you encounter issues:

1. Check Vercel documentation: [vercel.com/docs](https://vercel.com/docs)
2. Review MongoDB Atlas documentation
3. Check the application logs in Vercel dashboard
