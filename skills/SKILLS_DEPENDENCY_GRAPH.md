# Skills Dependency & Configuration Graph

## Dependency Graph

```mermaid
graph TD
    User[User / Project] --> SkillMgr[Claude Skill Management]
    User --> Find[Find Skills]
    
    subgraph "Core Development"
        Java[Java Architect]
        Java --> Maven[Maven Build (Internal)]
        Java --> Spring[Spring Boot]
        Java --> JPA[JPA / Hibernate]
    end
    
    subgraph "DevOps & Infrastructure"
        GitLab[GitLab CI Patterns]
        GitLab --> Docker[Docker / Containers]
        GitLab --> Git[Git Version Control]
        GitLab --> CI[CI/CD Pipelines]
    end
    
    subgraph "Quality Assurance"
        Test[Test Automator]
        Test --> Unit[Unit Testing]
        Test --> E2E[E2E Automation]
        Test --> Integ[Integration Testing]
    end
    
    %% Relationships
    Java -.-> Test : Requires Testing
    Java -.-> GitLab : Requires CI/CD
    SkillMgr -.-> Find : Manages
```

## Configuration Checklist

### 1. Java Architect
- [ ] **JDK:** Ensure Java 21 LTS is installed.
- [ ] **Build Tool:** Maven 3.8+ or Gradle 8.x.
- [ ] **Framework:** Spring Boot 3.x.

### 2. GitLab CI Patterns
- [ ] **CI Config:** `.gitlab-ci.yml` in project root.
- [ ] **Docker:** Docker Daemon running locally or on runner.
- [ ] **Registry:** Container registry access configured.

### 3. Test Automator
- [ ] **Frameworks:** JUnit 5, Mockito (for Java).
- [ ] **Environment:** Test environment variables configured.

### 4. Claude Skill Management
- [ ] **Env Var:** `$CLAUDE_METADATA` pointing to skills directory (Optional).
- [ ] **Structure:** Skills organized in `skills/` folder.

### 5. Find Skills
- [ ] **CLI:** `npx` available in path.
- [ ] **Network:** Access to `skills.sh` and GitHub.
