# Snatchers E-commerce Platform

A full-stack e-commerce platform with React frontend and Node.js backend.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (running locally or connection string)
- npm or yarn

### One-Command Setup
```bash
# Clone and navigate to project
cd Snatchers

# Install all dependencies and setup environment
npm run setup

# Start development servers
npm run dev
```

## 📋 Available Commands

### Development
- `npm run dev` - Start both servers in development mode with hot reload
- `npm start` - Start both servers in production mode
- `npm run setup` - Install dependencies and setup environment

### Individual Services
- `npm run dev:backend` - Start only backend in development mode
- `npm run dev:frontend` - Start only frontend
- `npm run start:backend` - Start only backend in production mode
- `npm run start:frontend` - Start only frontend

### Maintenance
- `npm run install:all` - Install dependencies for all projects
- `npm run clean` - Clean all node_modules and lock files
- `npm run health` - Check if both servers are running
- `npm test` - Run all tests
- `npm run build` - Build frontend for production

## 🌐 Server Information

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 🔧 Development Features

### Enhanced Development Experience
- **Colored Output**: Different colors for backend (blue) and frontend (green) logs
- **Auto-restart**: Backend automatically restarts on file changes using nodemon
- **Health Monitoring**: Built-in health check for both servers
- **Environment Management**: Separate development and production configurations
- **Dependency Management**: Automated dependency installation and cleanup

### Development Mode Benefits
- Hot reload for both frontend and backend
- Detailed error logging
- CORS enabled for cross-origin requests
- Debug mode enabled
- File watching with optimized polling

## 📁 Project Structure

```
Snatchers/
├── Snatchers_Backend/snatchers-backend-main/    # Node.js/Express API
├── Snatchers_Frontend/snatchers.in-main/       # React Frontend
├── scripts/                                    # Development utilities
│   ├── health-check.js                        # Server health monitoring
│   └── dev-setup.js                          # Development environment setup
├── .env.development                           # Development environment variables
└── package.json                              # Root package configuration
```

## 🛠️ Configuration

### Environment Variables
Development environment variables are managed in `.env.development`. Key settings:

- `BACKEND_PORT=5000` - Backend server port
- `FRONTEND_PORT=3000` - Frontend development server port
- `NODE_ENV=development` - Environment mode
- `MONGODB_URI` - Database connection string

### Backend Configuration
The backend uses nodemon in development mode with:
- Automatic restart on file changes
- Ignored directories: tests/, logs/
- Environment variable support
- Cross-platform compatibility

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:frontend
```

## 🚀 Production Deployment

```bash
# Build frontend
npm run build

# Start in production mode
npm start
```

## 🔍 Troubleshooting

### Health Check
```bash
npm run health
```

### Clean Installation
```bash
npm run clean
npm run setup
```

### Individual Server Issues
```bash
# Check backend logs
npm run logs

# Restart individual services
npm run dev:backend
npm run dev:frontend
```

## 📝 Development Workflow

1. **Initial Setup**: Run `npm run setup` once
2. **Daily Development**: Use `npm run dev` to start both servers
3. **Health Monitoring**: Use `npm run health` to verify everything is running
4. **Testing**: Run `npm test` before committing changes
5. **Clean Builds**: Use `npm run clean` if you encounter dependency issues

## 🎯 Features

- **Unified Development Server**: Single command starts both frontend and backend
- **Hot Reload**: Automatic restart and refresh on code changes
- **Health Monitoring**: Built-in server health checks
- **Environment Management**: Separate development and production configurations
- **Dependency Management**: Automated installation and cleanup scripts
- **Cross-platform Support**: Works on Windows, macOS, and Linux
- **Colored Logging**: Easy-to-read console output with color coding
- **Error Handling**: Graceful error handling and recovery