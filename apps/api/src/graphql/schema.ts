export const typeDefs = /* GraphQL */ `
  type Query {
    # Current user stats
    me: User

    # User's interview history
    interviews(limit: Int = 20, offset: Int = 0): InterviewConnection!

    # Single interview
    interview(id: ID!): Interview

    # User's resumes
    resumes: [Resume!]!

    # Admin: system overview stats
    adminStats: AdminStats

    # Admin: recent audit logs
    auditLogs(
      limit: Int = 50
      offset: Int = 0
      userId: String
      resource: String
    ): AuditLogConnection!
  }

  type Mutation {
    # Register a webhook for external integrations
    registerWebhook(
      url: String!
      events: [String!]!
      secret: String
    ): Webhook!

    # Delete a webhook
    deleteWebhook(id: ID!): Boolean!

    # Admin: update user role
    updateUserRole(userId: String!, role: String!): UserRole!
  }

  type User {
    id: ID!
    role: String!
    interviewCount: Int!
    resumeCount: Int!
    lastActivity: String
  }

  type Interview {
    id: ID!
    userId: String!
    resumeId: String!
    score: Int!
    feedback: String!
    metrics: [Metric!]!
    status: String!
    createdAt: String!
    videoUrl: String
  }

  type Metric {
    subject: String!
    A: Float!
    fullMark: Float!
  }

  type InterviewConnection {
    items: [Interview!]!
    total: Int!
    hasMore: Boolean!
  }

  type Resume {
    id: ID!
    fileName: String!
    previewText: String!
    createdAt: String!
  }

  type AdminStats {
    totalUsers: Int!
    totalInterviews: Int!
    totalResumes: Int!
    avgScore: Float!
    activeToday: Int!
    topLanguages: [LanguageStat!]!
  }

  type LanguageStat {
    language: String!
    count: Int!
  }

  type AuditLogEntry {
    id: ID!
    userId: String!
    role: String!
    action: String!
    resource: String!
    status: String!
    createdAt: String!
  }

  type AuditLogConnection {
    items: [AuditLogEntry!]!
    total: Int!
    hasMore: Boolean!
  }

  type Webhook {
    id: ID!
    url: String!
    events: [String!]!
    active: Boolean!
    createdAt: String!
  }

  type UserRole {
    userId: String!
    role: String!
    assignedAt: String!
  }
`;
