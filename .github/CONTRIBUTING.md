# Contributing to Windsurf Project

Thank you for your interest in contributing to the Windsurf Project! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- Python 3.11 or higher
- Git

### Setting Up Development Environment

1. **Fork the repository**
   ```bash
   # Clone your fork
   git clone https://github.com/YOUR-USERNAME/windsurf-project.git
   cd windsurf-project
   ```

2. **Install dependencies**
   ```bash
   # Frontend dependencies
   cd frontend && npm install && cd ..
   
   # Backend dependencies
   cd backend && npm install && cd ..
   
   # Python dependencies
   pip install -r requirements.txt
   ```

3. **Run the development environment**
   ```bash
   # Start development servers
   npm run dev
   ```

## 📝 How to Contribute

### Reporting Bugs
- Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml)
- Include detailed reproduction steps
- Provide environment information

### Suggesting Features
- Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml)
- Explain the problem your feature solves
- Consider implementation complexity

### Contributing Code

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes**
   - Follow the coding standards below
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   # Run tests
   npm test
   
   # Run linting
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature" # See commit conventions below
   ```

5. **Push and create PR**
   ```bash
   git push origin your-branch-name
   ```
   Then create a Pull Request using our [PR template](.github/pull_request_template.md)

## 📋 Coding Standards

### General Guidelines
- Write clear, readable code
- Add comments for complex logic
- Follow existing code patterns
- Keep functions small and focused

### Frontend (React/TypeScript)
- Use TypeScript for type safety
- Follow React hooks best practices
- Use functional components
- Implement proper error boundaries

### Backend (Python)
- Follow PEP 8 style guidelines
- Use type hints
- Write comprehensive docstrings
- Handle errors gracefully

### Commit Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

Examples:
feat: add user authentication
fix: resolve database connection issue
docs: update API documentation
test: add unit tests for user service
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

## 🧪 Testing

### Running Tests
```bash
# All tests
npm test

# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test

# Python tests
pytest
```

### Writing Tests
- Write unit tests for new functions
- Add integration tests for new features
- Include edge cases and error scenarios
- Maintain test coverage above 80%

## 📚 Documentation

- Update README.md for significant changes
- Add/update API documentation
- Include code examples
- Update changelog for releases

## 🏷️ Labels and Issues

We use a comprehensive labeling system:

### Priority
- `priority: critical` - Critical issues
- `priority: high` - High priority
- `priority: medium` - Medium priority
- `priority: low` - Low priority

### Type
- `bug` - Something isn't working
- `enhancement` - New feature request
- `documentation` - Documentation related
- `question` - Need more information

### Component
- `component: frontend` - Frontend changes
- `component: backend` - Backend changes
- `component: api` - API related
- `component: database` - Database related

## 🔄 Review Process

### For Contributors
1. Ensure all tests pass
2. Follow the PR template
3. Respond to review feedback promptly
4. Keep PRs focused and small

### For Reviewers
1. Check code quality and style
2. Verify test coverage
3. Test functionality locally
4. Provide constructive feedback

## 🚫 What Not to Contribute

- Breaking changes without discussion
- Large refactors without prior approval
- Features that don't align with project goals
- Code that doesn't follow our standards

## 📞 Getting Help

- 💬 [GitHub Discussions](https://github.com/scarecr0w12/windsurf-project/discussions)
- 🐛 [Report Issues](https://github.com/scarecr0w12/windsurf-project/issues)
- 💡 [Feature Requests](https://github.com/scarecr0w12/windsurf-project/issues/new?template=feature_request.yml)

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to the Windsurf Project! 🎉
