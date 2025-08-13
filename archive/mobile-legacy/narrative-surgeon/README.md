# Narrative Surgeon

[![Version](https://img.shields.io/badge/version-4.0.0-blue.svg)](https://github.com/your-org/narrative-surgeon)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![React Native](https://img.shields.io/badge/React%20Native-0.73-61dafb.svg)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6.svg)](https://www.typescriptlang.org/)

> **The Complete Manuscript Analysis and Agent Submission Platform**

Narrative Surgeon is a comprehensive React Native application that helps authors analyze, revise, and professionally submit their manuscripts to literary agents. Combining advanced AI analysis with industry-standard submission tools, it's the complete toolkit for serious fiction writers.

## 🌟 Features

### 📚 Manuscript Management
- **Scene-based Organization** - Break manuscripts into manageable scenes
- **Character Tracking** - Detailed character profiles and voice analysis
- **Word Count Analytics** - Real-time tracking and progress monitoring
- **Genre Classification** - Automatic genre detection and optimization

### 🤖 AI-Powered Analysis
- **Opening Analysis** - Hook strength, voice establishment, genre appropriateness
- **Scene Analysis** - Emotion, tension, pacing, and function detection
- **Character Voice** - Consistency tracking and dialogue analysis
- **Pacing Analysis** - Beats per thousand words with comp title comparisons
- **Pattern Detection** - Filter words, passive voice, repetition, and more

### ✏️ Revision Workspace
- **Multiple Revision Modes** - Opening polish, dialogue enhancement, tension calibration
- **Intelligent Diff Editor** - Track changes with impact scoring
- **Session Management** - Organized revision workflows
- **Beta Reader Simulation** - 5 different reader persona types
- **Suggestion Engine** - AI-powered recommendations with ranking

### 🎯 Agent Submission Suite
- **Query Letter Generator** - AI-optimized with personalization
- **Synopsis Builder** - One-page, two-page, and chapter-by-chapter formats
- **Sample Pages Formatter** - Industry-standard manuscript formatting
- **Agent Research** - Compatibility matching with 100+ agent profiles
- **Submission Tracking** - Complete workflow from query to response
- **Analytics Dashboard** - Performance insights and optimization recommendations

### 📄 Export & Formatting
- **Multiple Formats** - PDF, DOCX, RTF, TXT export options
- **Industry Standards** - Professional manuscript formatting
- **Submission Packages** - Complete agent submission bundles
- **Custom Formatting** - Agent-specific requirements support

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- React Native CLI
- iOS: Xcode 14+ (for iOS development)
- Android: Android Studio with SDK 31+ (for Android development)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/narrative-surgeon.git
cd narrative-surgeon

# Install dependencies
npm install

# iOS additional setup
cd ios && pod install && cd ..

# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### Environment Setup

Create a `.env` file in the root directory:

```env
# LLM Provider Configuration
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here  # Optional

# App Configuration
NODE_ENV=development
LOG_LEVEL=debug

# Database Configuration (Production)
DATABASE_URL=your_database_url_here  # For production deployments
```

## 📱 Usage

### Getting Started

1. **Create Your First Manuscript**
   - Tap "New Manuscript" on the home screen
   - Enter title, genre, and target audience
   - Add comp titles for better analysis

2. **Import Your Content**
   - Add scenes one by one or import from text files
   - The app automatically detects chapter breaks and scene divisions
   - Characters are automatically extracted and tracked

3. **Analyze Your Work**
   - Run opening analysis to check hook strength
   - Use scene analysis to identify pacing and tension issues
   - Check character voice consistency across scenes

4. **Revise with AI Assistance**
   - Enter Revision Workspace for guided editing
   - Choose from 7 specialized revision modes
   - Apply AI suggestions with impact tracking

5. **Prepare for Submission**
   - Generate professional query letters
   - Create synopses in multiple formats
   - Format sample pages to industry standards
   - Research and match with compatible agents

### Core Workflows

#### Manuscript Analysis Workflow
```
Import Manuscript → Scene Analysis → Character Analysis → 
Opening Analysis → Pattern Detection → Revision Recommendations
```

#### Submission Preparation Workflow
```
Generate Query Letter → Create Synopsis → Format Sample Pages → 
Research Agents → Create Submission → Track Responses
```

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React Native 0.73 with TypeScript
- **Database**: SQLite with expo-sqlite
- **State Management**: Zustand
- **AI Integration**: OpenAI API with provider abstraction
- **Storage**: react-native-mmkv for secure key storage
- **Navigation**: React Navigation 6
- **Testing**: Jest + React Native Testing Library

### Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── DiffEditor.tsx          # Intelligent diff editor
│   ├── CompAnalysisComparison.tsx  # Comp title analysis
│   └── ...
├── screens/             # Main application screens  
│   ├── ManuscriptsScreen.tsx   # Manuscript management
│   ├── RevisionWorkspace.tsx   # Advanced editing interface
│   ├── AnalysisScreen.tsx      # AI analysis dashboard
│   └── ...
├── services/            # Core business logic
│   ├── database.ts             # SQLite database management
│   ├── llmProvider.ts          # AI service integration
│   ├── analysisService.ts      # Content analysis engine
│   ├── queryLetterGenerator.ts # Query letter creation
│   ├── submissionTracker.ts    # Submission management
│   └── ...
├── store/              # State management
│   └── manuscriptStore.ts      # Zustand store
├── types/              # TypeScript definitions
│   └── index.ts               # All type definitions
└── utils/              # Helper functions
```

### Database Schema

The application uses a normalized SQLite database with 15+ tables:

- **manuscripts** - Core manuscript information
- **scenes** - Individual scene content and metadata
- **characters** - Character profiles and voice analysis
- **scene_analysis** - AI analysis results
- **revision_sessions** - Editing session tracking
- **query_letters** - Generated query letters with versions
- **agent_database** - Literary agent profiles
- **submission_tracking** - Submission lifecycle management
- And more...

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

### Test Structure

- **Unit Tests** - Individual service and component testing
- **Integration Tests** - Cross-service workflow testing
- **Phase Tests** - Feature-complete testing for each development phase
- **Performance Tests** - Response time and concurrency validation

### Coverage Goals

- **Statements**: > 80%
- **Branches**: > 75% 
- **Functions**: > 85%
- **Lines**: > 80%

## 📊 Performance

### Benchmarks

- **Scene Analysis**: < 3 seconds per scene
- **Query Letter Generation**: < 5 seconds average
- **Agent Matching**: < 2 seconds for 100+ agents
- **Database Operations**: < 100ms for complex queries
- **App Startup**: < 3 seconds on modern devices

### Optimization Features

- **Lazy Loading** - Components and data loaded on demand
- **Caching** - Intelligent caching of analysis results
- **Background Processing** - Long-running tasks handled asynchronously
- **Memory Management** - Efficient cleanup and garbage collection

## 🛠️ Development

### Development Setup

```bash
# Install development dependencies
npm install --include=dev

# Set up pre-commit hooks
npm run prepare

# Run linter
npm run lint

# Run type checking
npm run type-check
```

### Code Standards

- **TypeScript** - Strict mode enabled with comprehensive typing
- **ESLint** - Airbnb configuration with React Native extensions
- **Prettier** - Consistent code formatting
- **Husky** - Pre-commit hooks for quality assurance

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Run the full test suite (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Phases

The project was developed in 4 distinct phases:

- **Phase 1**: Core Infrastructure (Database, Scene Management, Basic Analysis)
- **Phase 2**: LLM Integration (AI Analysis, Character Voice, Pacing)
- **Phase 3**: Revision Workspace (Advanced Editing, Beta Reader Simulation)
- **Phase 4**: Agent Submission Suite (Query Letters, Agent Research, Analytics)

## 🚀 Deployment

### Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment instructions.

#### Quick Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] Monitoring and alerting configured
- [ ] Backup procedures in place
- [ ] Load testing completed

#### Build Commands

```bash
# Production build
npm run build:production

# iOS release build
npm run ios:release

# Android release build  
npm run android:release
```

### Hosting Options

- **Mobile Apps**: iOS App Store, Google Play Store
- **Web Version**: Vercel, Netlify, AWS Amplify
- **Self-hosted**: Docker containers with Nginx reverse proxy

## 🔐 Security

### Data Protection

- **Encrypted Storage** - All sensitive data encrypted at rest
- **Secure Transmission** - HTTPS/TLS for all API communications
- **API Key Management** - Secure storage with react-native-mmkv
- **Input Validation** - Comprehensive sanitization and validation
- **Audit Logging** - Complete user action tracking

### Privacy Features

- **Local Processing** - Manuscript content processed locally when possible
- **Data Minimization** - Only necessary data sent to external services
- **User Control** - Complete data export and deletion capabilities
- **Anonymization** - Optional anonymous usage analytics

## 📈 Analytics & Monitoring

### Application Monitoring

- **Performance Metrics** - Response times, memory usage, crash rates
- **User Analytics** - Feature usage, user flows, retention metrics
- **Error Tracking** - Comprehensive error logging and alerting
- **Business Metrics** - Query success rates, agent match quality

### Health Checks

```bash
# Check application health
curl -I https://your-app-domain.com/health

# Database connection test
npm run db:check

# External service health
npm run services:check
```

## 🤝 Support & Community

### Getting Help

- **Documentation**: Comprehensive guides and API documentation
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Community support and questions
- **Email Support**: support@narrativesurgeon.com

### FAQ

**Q: Can I use my own OpenAI API key?**
A: Yes, you can configure your own API key in the settings. This gives you direct control over usage and costs.

**Q: Is my manuscript data secure?**
A: Yes, all manuscript content is stored locally on your device with optional encrypted cloud sync. We use industry-standard security practices.

**Q: Can I export my work to other writing tools?**
A: Yes, the app supports multiple export formats (DOCX, RTF, TXT, PDF) compatible with most writing software.

**Q: How accurate is the agent matching?**
A: Our algorithm considers 12+ factors including genre fit, client success, response times, and submission preferences. Match accuracy improves with more detailed manuscript information.

## 📋 Roadmap

### Version 4.1 (Next Minor Release)
- [ ] Enhanced mobile UI optimizations
- [ ] Offline mode improvements
- [ ] Additional export templates
- [ ] Performance optimizations

### Version 5.0 (Next Major Release)
- [ ] Advanced AI features with GPT-4 integration
- [ ] Community features and peer feedback
- [ ] Publisher direct submission integration
- [ ] Advanced analytics dashboard

### Long-term Vision
- [ ] Multi-language support
- [ ] Collaborative editing features
- [ ] Advanced market analysis tools
- [ ] Professional editor marketplace integration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** - For providing the AI analysis capabilities
- **React Native Community** - For the excellent framework and libraries
- **Publishing Industry Professionals** - For guidance on industry standards
- **Beta Testers** - For invaluable feedback during development
- **Open Source Contributors** - For improving the codebase

## 📞 Contact

- **Website**: https://narrativesurgeon.com
- **Email**: hello@narrativesurgeon.com  
- **Twitter**: [@NarrativeSurg](https://twitter.com/NarrativeSurg)
- **GitHub**: [github.com/your-org/narrative-surgeon](https://github.com/your-org/narrative-surgeon)

---

**Built with ❤️ for authors who take their craft seriously.**

*Narrative Surgeon - Where Technology Meets Literary Excellence*