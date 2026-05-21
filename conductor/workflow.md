# Project Workflow

## Guiding Principles

1. **The Plan is the Source of Truth:** All work must be tracked in `plan.md`.
2. **The Tech Stack is Deliberate:** Changes to the tech stack must be documented in `tech-stack.md` before implementation.
3. **Test-Driven Development:** Write tests before implementing functionality.
4. **Behavior Over Theater:** Tests must prove externally meaningful behavior, not just that code rendered, a class exists, or a mocked function was called.
5. **High Code Coverage:** Aim for >80% code coverage for all modules, but never use coverage percentage as evidence that tests are meaningful.
6. **User Experience First:** Every decision should prioritize user experience.
7. **Non-Interactive & CI-Aware:** Prefer non-interactive commands. Use `CI=true` for watch-mode tools (tests, linters) to ensure single execution.
8. **State Docs Stay Current:** For dashboard or UI work, read `conductor/dashboard-state.md` and `conductor/ui-components.md` before implementation and update them before the phase is closed when behavior changes.

## Branch and Pull Request Workflow

1. **Never Commit to the Default Branch Directly:** The repository default branch is currently `master`. Treat the default branch generically in workflow steps so the process survives a future rename.
2. **One Track, One Branch:** Each active track should run on a dedicated branch created from the default branch. Preferred naming: `conductor/<track_id>`.
3. **PR First, Merge Last:** Push the track branch and create a draft PR as soon as the branch has meaningful work. Keep the PR updated throughout execution. Do not merge without explicit user approval.
4. **If PR Tooling Is Blocked, Surface It:** If branch creation, push, or PR creation is blocked by missing credentials, missing tooling, or network restrictions, stop at the blocker and report the exact issue instead of silently falling back to direct commits on the default branch.

## Task Workflow

All tasks follow a strict lifecycle:

### Standard Task Workflow

1. **Select Task:** Choose the next available task from `plan.md` in sequential order.

2. **Create or Switch to the Track Branch:** Ensure you are on the track branch created from the default branch before making any task changes.

3. **Mark In Progress:** Before beginning work, edit `plan.md` and change the task from `[ ]` to `[~]`.

4. **Write Failing Tests (Red Phase):**
   - Create or update the test file that best exercises the user-visible or API-visible contract for the feature or bug fix.
   - Before writing the test, identify the real contract being protected: API status/body, persisted database state, retry behavior, visible UI state, auth behavior, or other externally observable result.
   - Write tests that clearly define the expected behavior and acceptance criteria for the task.
   - Include at least one negative-path or failure-mode test when the code touches IO, parsing, auth, retries, concurrency, or error handling.
   - For backend logic, prefer integration-style tests with a real test database and mocks only at provider or network boundaries when practical.
   - For frontend logic, assert visible behavior and state transitions. Do not write tests whose main value is checking CSS classes, implementation details, or trivial static text that can pass while the feature is broken.
   - Do not require real secrets, live third-party credentials, or live network access in automated tests.
   - **CRITICAL:** Run the tests and confirm that they fail for the right reason. This is the "Red" phase of TDD. Do not proceed until you have failing tests that demonstrate the intended contract.

5. **Implement to Pass Tests (Green Phase):**
   - Write the minimum amount of application code necessary to make the failing tests pass.
   - Run the test suite again and confirm that all tests now pass. This is the "Green" phase.

6. **Refactor (Optional but Recommended):**
   - With the safety of passing tests, refactor the implementation code and the test code to improve clarity, remove duplication, and enhance performance without changing the external behavior.
   - Rerun tests to ensure they still pass after refactoring.

7. **Verify Coverage:** Run coverage reports using the project's chosen tools. For example, in a Python project, this might look like:
   ```bash
   pytest --cov=app --cov-report=html
   ```
   Target: >80% coverage for new code. The specific tools and commands will vary by language and framework.
   Coverage is a secondary gate. If the tests are shallow, structural, or mock away the real failure mode, the coverage number does not count as success.

8. **Document Deviations:** If implementation differs from tech stack:
   - **STOP** implementation.
   - Update `tech-stack.md` with the new design.
   - Add a dated note explaining the change.
   - Resume implementation.

9. **Update State Docs When Needed:**
   - If the task changes the dashboard's visible behavior, interaction model, or component inventory, update `conductor/dashboard-state.md` and/or `conductor/ui-components.md` before finalizing the task.

10. **Commit Code Changes on the Track Branch:**
   - Stage all code changes related to the task.
   - Propose a clear, concise commit message, for example `feat(ui): Create basic HTML structure for calculator`.
   - Perform the commit on the track branch.

11. **Attach Task Summary with Git Notes:**
   - **Step 11.1: Get Commit Hash:** Obtain the hash of the just-completed commit (`git log -1 --format="%H"`).
   - **Step 11.2: Draft Note Content:** Create a detailed summary for the completed task. This should include the task name, a summary of changes, a list of all created or modified files, and the core "why" for the change.
   - **Step 11.3: Attach Note:** Use the `git notes` command to attach the summary to the commit.
     ```bash
     git notes add -m "<note content>" <commit_hash>
     ```

12. **Get and Record Task Commit SHA:**
   - **Step 12.1: Update Plan:** Read `plan.md`, find the line for the completed task, update its status from `[~]` to `[x]`, and append the first 7 characters of the just-completed commit hash.
   - **Step 12.2: Write Plan:** Write the updated content back to `plan.md`.

13. **Commit Plan Update on the Track Branch:**
   - Stage the modified `plan.md` file.
   - Commit this change with a descriptive message, for example `conductor(plan): Mark task 'Create user model' as complete`.

14. **Push Branch and Update the Draft PR:**
   - Push the track branch after the task commits are complete.
   - Create the draft PR if it does not exist yet.
   - Otherwise, update the existing PR title, body, and checklist so it reflects task status, test status, and any reviewer context.
   - If PR creation or update cannot be completed because tooling or credentials are unavailable, stop and report the blocker instead of continuing as though review exists.

### Phase Completion Verification and Checkpointing Protocol

**Trigger:** This protocol is executed immediately after a task is completed that also concludes a phase in `plan.md`.

1. **Announce Protocol Start:** Inform the user that the phase is complete and the verification and checkpointing protocol has begun.

2. **Ensure Test Coverage for Phase Changes:**
   - **Step 2.1: Determine Phase Scope:** To identify the files changed in this phase, first find the starting point. Read `plan.md` to find the Git commit SHA of the previous phase's checkpoint. If no previous checkpoint exists, the scope is all changes since the first commit.
   - **Step 2.2: List Changed Files:** Execute `git diff --name-only <previous_checkpoint_sha> HEAD` to get a precise list of all files modified during this phase.
   - **Step 2.3: Verify and Create Tests:** For each file in the list:
     - First, check its extension. Exclude non-code files such as `.json`, `.md`, and `.yaml`.
     - For each remaining code file, verify a corresponding test file exists.
     - If a test file is missing, create one. Before writing the test, analyze other test files in the repository to determine the correct naming convention and testing style.
     - Do not create placeholder or structural tests just to satisfy file parity. New tests must validate the functionality described in this phase's tasks in `plan.md`, including meaningful success criteria and relevant failure behavior.

3. **Execute Automated Tests with Proactive Debugging:**
   - Before execution, announce the exact shell command you will use to run the tests.
   - Example announcement: `I will now run the automated test suite to verify the phase. Command: CI=true npm test`
   - Execute the announced command.
   - If tests fail, inform the user and begin debugging. You may attempt to propose a fix a maximum of two times. If the tests still fail after your second proposed fix, stop, report the persistent failure, and ask the user for guidance.

4. **Propose a Detailed, Actionable Manual Verification Plan:**
   - To generate the plan, first analyze `product.md`, `product-guidelines.md`, and `plan.md` to determine the user-facing goals of the completed phase.
   - Generate a step-by-step plan that walks the user through the verification process, including any necessary commands and specific expected outcomes.
   - The plan should follow a format like:

     **For a Frontend Change:**
     ```text
     The automated tests have passed. For manual verification, please follow these steps:

     Manual Verification Steps:
     1. Start the development server with the command: `npm run dev`
     2. Open your browser to: `http://localhost:3000`
     3. Confirm that you see: The new user profile page, with the user's name and email displayed correctly.
     ```

     **For a Backend Change:**
     ```text
     The automated tests have passed. For manual verification, please follow these steps:

     Manual Verification Steps:
     1. Ensure the server is running.
     2. Execute the following command in your terminal: `curl -X POST http://localhost:8080/api/v1/users -d '{"name": "test"}'`
     3. Confirm that you receive: A JSON response with a status of `201 Created`.
     ```

5. **Await Explicit User Feedback:**
   - After presenting the detailed plan, ask the user for confirmation: `Does this meet your expectations? Please confirm with yes or provide feedback on what needs to be changed.`
   - Pause and await the user's response. Do not proceed without explicit confirmation.

6. **Create Checkpoint Commit on the Track Branch:**
   - Stage all changes. If no changes occurred in this step, proceed with an empty commit.
   - Perform the commit with a clear and concise message, for example `conductor(checkpoint): Checkpoint end of Phase X`.

7. **Attach Auditable Verification Report Using Git Notes:**
   - **Step 7.1: Draft Note Content:** Create a detailed verification report including the automated test command, the manual verification steps, and the user's confirmation.
   - **Step 7.2: Attach Note:** Use the `git notes` command and the full commit hash from the previous step to attach the full report to the checkpoint commit.

8. **Get and Record Phase Checkpoint SHA:**
   - **Step 8.1: Get Commit Hash:** Obtain the hash of the just-created checkpoint commit (`git log -1 --format="%H"`).
   - **Step 8.2: Update Plan:** Read `plan.md`, find the heading for the completed phase, and append the first 7 characters of the commit hash in the format `[checkpoint: <sha>]`.
   - **Step 8.3: Write Plan:** Write the updated content back to `plan.md`.

9. **Commit Plan Update on the Track Branch:**
   - Stage the modified `plan.md` file.
   - Commit this change with a descriptive message following the format `conductor(plan): Mark phase '<PHASE NAME>' as complete`.

10. **Push Branch and Update the Draft PR:**
    - Push the track branch.
    - Update the draft PR with the completed phase summary, test results, manual verification steps, and the checkpoint SHA.
    - Keep the PR in draft until the user explicitly confirms it should move forward.

11. **Announce Completion:** Inform the user that the phase is complete, the checkpoint exists on the track branch, and the draft PR has been updated.

### Quality Gates

Before marking any task complete, verify:

- [ ] All tests pass
- [ ] Code coverage meets requirements (>80%)
- [ ] Code follows project's code style guidelines (as defined in `code_styleguides/`)
- [ ] All public functions and methods are documented (for example, docstrings or JSDoc)
- [ ] Type safety is enforced (for example, type hints or TypeScript types)
- [ ] No linting or static analysis errors
- [ ] Works correctly on mobile (if applicable)
- [ ] Documentation updated if needed
- [ ] No security vulnerabilities introduced
- [ ] Relevant state docs updated when the UI or dashboard behavior changed
- [ ] Draft PR exists or has been updated for the current track branch

## Development Commands

### Setup
```bash
# Install root dependencies
npm install

# Install backend dependencies and generate Prisma client
cd backend
npm install
npx.cmd prisma generate

# Install frontend dependencies
cd ../frontend
npm install
```

### Daily Development
```bash
# Run both backend and frontend in development mode (from root)
npm.cmd run dev

# Run backend only
cd backend
npm.cmd run dev

# Run frontend only
cd frontend
npm.cmd run dev

# Run backend tests
cd backend
npm.cmd test

# Run frontend tests
cd frontend
npm.cmd test
```

### Before Committing
```bash
# Run all tests
cd backend && npm.cmd test
cd ../frontend && npm.cmd test

# Check Prisma schema
cd backend
npx.cmd prisma validate
```

## Testing Requirements

### Unit Testing
- Every module must have corresponding tests.
- Use appropriate test setup and teardown mechanisms.
- Mock external dependencies.
- Test both success and failure cases.
- Prefer assertions on outputs, persisted state, and observable side effects over assertions on internal calls.
- Do not write tests that require real environment secrets or live external services.
- Avoid snapshotting or CSS-class assertions unless the styling token itself is the contract being changed.

### Integration Testing
- Test complete user flows.
- Verify database transactions.
- Test authentication and authorization.
- Check form submissions.
- For backend work involving databases, queues, retries, parsing, or multi-step flows, integration tests are preferred over heavily mocked unit tests.
- Mock at the network or provider boundary, not by mocking away the service under test.

### Mobile Testing
- Test on an actual iPhone when possible.
- Use Safari developer tools.
- Test touch interactions.
- Verify responsive layouts.
- Check performance on 3G and 4G.

## Code Review Process

### Self-Review Checklist
Before requesting review:

1. **Functionality**
   - Feature works as specified.
   - Edge cases handled.
   - Error messages are user-friendly.

2. **Code Quality**
   - Follows style guide.
   - DRY principle applied.
   - Clear variable and function names.
   - Appropriate comments.

3. **Testing**
   - Unit tests comprehensive where unit tests make sense.
   - Integration tests cover stateful and IO-heavy flows.
   - Coverage adequate (>80%), with assertions that prove real contracts.

4. **Security**
   - No hardcoded secrets.
   - Input validation present.
   - SQL injection prevented.
   - XSS protection in place.

5. **Performance**
   - Database queries optimized.
   - Images optimized.
   - Caching implemented where needed.

6. **Mobile Experience**
   - Touch targets adequate (44x44px).
   - Text readable without zooming.
   - Performance acceptable on mobile.
   - Interactions feel native.

## Commit Guidelines

### Message Format
```text
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting only
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests
- `chore`: Maintenance tasks

### Examples
```bash
git commit -m "feat(auth): Add remember me functionality"
git commit -m "fix(posts): Correct excerpt generation for short posts"
git commit -m "test(comments): Add tests for emoji reaction limits"
git commit -m "style(mobile): Improve button touch targets"
```

## Definition of Done

A task is complete when:

1. All code implemented to specification.
2. Unit tests written and passing.
3. Integration tests added where the change touches IO, persistence, auth, retries, parsing, or concurrency.
4. Code coverage meets project requirements.
5. Documentation complete if applicable.
6. Code passes all configured linting and static analysis checks.
7. Works beautifully on mobile if applicable.
8. Implementation notes added to `plan.md`.
9. Changes committed to the track branch with proper messages.
10. Git note with task summary attached to the commit.
11. Draft PR created or updated for the track branch.

## Emergency Procedures

### Critical Bug in Production
1. Create a hotfix branch from the default branch.
2. Write a failing test for the bug.
3. Implement the minimal fix.
4. Test thoroughly, including mobile.
5. Deploy immediately.
6. Open or update a PR for the hotfix branch.
7. Document in `plan.md`.

### Data Loss
1. Stop all write operations.
2. Restore from the latest backup.
3. Verify data integrity.
4. Document the incident.
5. Update backup procedures.

### Security Breach
1. Rotate all secrets immediately.
2. Review access logs.
3. Patch the vulnerability.
4. Notify affected users if any.
5. Document and update security procedures.

## Deployment Workflow

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Coverage >80%
- [ ] No linting errors
- [ ] Mobile testing complete
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Backup created

### Deployment Steps
1. Merge the approved PR into the default branch.
2. Tag the release with a version.
3. Push to the deployment service.
4. Run database migrations.
5. Verify deployment.
6. Test critical paths.
7. Monitor for errors.

### Post-Deployment
1. Monitor analytics.
2. Check error logs.
3. Gather user feedback.
4. Plan the next iteration.

## Continuous Improvement

- Review workflow weekly.
- Update based on pain points.
- Document lessons learned.
- Optimize for user happiness.
- Keep things simple and maintainable.
