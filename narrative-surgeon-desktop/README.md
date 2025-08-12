# Narrative Surgeon Desktop

A comprehensive professional manuscript writing and publishing workflow management application built with Next.js, Tauri, and TypeScript.

## 🚀 Features

### ✍️ Advanced Writing Engine
- **Professional Text Editor**: Distraction-free writing environment with real-time formatting
- **Scene-Based Organization**: Structure your manuscript with chapters and scenes
- **Version Control**: Track changes and maintain writing history
- **Auto-Save**: Never lose your work with intelligent auto-saving
- **Export Formats**: Industry-standard formats including Shunn manuscript, DOCX, PDF, and more

### 🤖 AI-Powered Analysis
- **Real-time Writing Insights**: Pacing, readability, and style analysis
- **Genre-Specific Feedback**: Tailored suggestions based on your manuscript's genre
- **Character Development Tracking**: Monitor character arcs and consistency
- **Dialogue Analysis**: Improve conversation flow and authenticity
- **Performance Optimization**: AI recommendations to enhance your submission success rate

### 📝 Professional Publishing Tools
- **Query Letter Generator**: AI-powered query letter creation with industry templates
- **Agent Research Database**: Comprehensive agent matching with 85%+ relevance scoring
- **Submission Tracker**: Complete submission lifecycle management with automated follow-ups
- **Market Research**: Competitive analysis and genre trend insights
- **Performance Analytics**: Success predictors and optimization recommendations

### 📤 Industry-Standard Exports
- **Shunn Manuscript Format**: Industry-standard professional manuscript formatting
- **Query Packages**: Complete submission packages with query + synopsis + sample pages
- **Synopsis Formats**: Both short (1-page) and extended (2-5 page) synopsis generation
- **Pitch Sheets**: Marketing-focused sales materials for publishers
- **Book Proposals**: Comprehensive non-fiction proposal formatting
- **Screenplay & Stage Play**: Professional script formatting for multimedia works

### 📊 Advanced Analytics
- **Writing Performance**: Track daily word counts, writing streaks, and productivity
- **Submission Analytics**: Response rates, agent matching success, and market timing
- **Competitive Intelligence**: Market positioning and differentiation opportunities
- **Success Prediction**: AI-powered forecasting of publication potential

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, Radix UI
- **Backend**: Tauri (Rust) for native desktop performance
- **Database**: SQLite with Tauri SQL plugin
- **AI Integration**: OpenAI GPT-4, Anthropic Claude for content analysis
- **Testing**: Playwright (E2E), Jest (Unit), React Testing Library
- **Distribution**: Cross-platform installers for Windows, macOS, and Linux

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Rust 1.70+
- Platform-specific build tools:
  - **Windows**: Visual Studio Build Tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: build-essential, libwebkit2gtk-4.0-dev

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/narrative-surgeon-desktop.git
   cd narrative-surgeon-desktop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your API keys
   ```

4. **Initialize the database**
   ```bash
   npm run db:migrate
   ```

5. **Start development server**
   ```bash
   npm run tauri dev
   ```

### Production Build

```bash
# Build for current platform
npm run tauri build

# Build for specific platforms
npm run build:windows
npm run build:macos
npm run build:linux
```

## 🧪 Testing

### Run Test Suite
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# End-to-end tests
npm run test:e2e

# All tests with coverage
npm run test:all
```

### Performance Testing
```bash
# Benchmark critical operations
npm run test:performance

# Memory leak detection
npm run test:memory

# Load testing
npm run test:load
```

## 🚀 Deployment

### Code Signing Setup

1. **Windows**: Obtain code signing certificate and set environment variables:
   ```bash
   set WINDOWS_CERTIFICATE_THUMBPRINT=your_thumbprint
   ```

2. **macOS**: Configure Apple Developer ID:
   ```bash
   export APPLE_CERTIFICATE="Developer ID Application: Your Name"
   export APPLE_ID="your@email.com"
   export APPLE_PASSWORD="app-specific-password"
   ```

3. **Linux**: Setup GPG signing:
   ```bash
   gpg --import private-key.asc
   export GPG_KEY_ID=your_key_id
   ```

### Release Process

```bash
# Create production build with signing
npm run build:release

# Generate update manifests
npm run generate:updates

# Upload to distribution channels
npm run deploy:release
```

## 📚 Documentation

### User Documentation
- [Getting Started Guide](docs/user/getting-started.md)
- [Writing Features](docs/user/writing-features.md)
- [Publishing Workflow](docs/user/publishing-workflow.md)
- [Export Formats](docs/user/export-formats.md)
- [Troubleshooting](docs/user/troubleshooting.md)

### Developer Documentation
- [Architecture Overview](docs/dev/architecture.md)
- [API Documentation](docs/dev/api.md)
- [Plugin Development](docs/dev/plugins.md)
- [Contributing Guidelines](docs/dev/contributing.md)
- [Build Process](docs/dev/building.md)

## 🔧 Configuration

### Application Settings

The application stores settings in:
- **Windows**: `%APPDATA%/Narrative Surgeon/`
- **macOS**: `~/Library/Application Support/Narrative Surgeon/`
- **Linux**: `~/.config/narrative-surgeon/`

Key configuration files:
- `settings.json`: User preferences and UI settings
- `claude.md`: AI assistant memory and context
- `manuscripts.db`: Local manuscript database

## 🔒 Security & Privacy

### Data Protection
- **Local Storage**: All manuscripts stored locally on your device
- **Encrypted API Keys**: Secure credential storage using OS keychain
- **No Data Collection**: Your writing never leaves your device without explicit export
- **Privacy First**: No telemetry or usage tracking by default

### Security Features
- **Code Signing**: All releases signed with trusted certificates
- **Sandboxing**: Application runs in restricted security context
- **Update Verification**: Cryptographic signature verification for updates
- **Permission Model**: Explicit consent for file system and network access

## 🤝 Contributing

We welcome contributions from the writing and developer communities!

### Getting Started
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Run the test suite (`npm run test:all`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the Commercial License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- 📧 **Email Support**: [support@narrativesurgeon.com](mailto:support@narrativesurgeon.com)
- 💬 **Community Forum**: [community.narrativesurgeon.com](https://community.narrativesurgeon.com)
- 🗣️ **Discord Server**: [discord.gg/narrativesurgeon](https://discord.gg/narrativesurgeon)
- 📚 **Knowledge Base**: [help.narrativesurgeon.com](https://help.narrativesurgeon.com)

---

**Made with ❤️ for writers who take their craft seriously.**

For more information, visit [narrativesurgeon.com](https://narrativesurgeon.com)
