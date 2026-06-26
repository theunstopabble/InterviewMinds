import mongoose from "mongoose";

const ssoConfigSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["okta", "azure-ad", "google-workspace", "custom"],
      required: true,
      unique: true,
    },
    enabled: { type: Boolean, default: false },
    samlSettings: {
      entryPoint: String,
      issuer: String,
      cert: String,
      callbackUrl: String,
      signatureAlgorithm: {
        type: String,
        enum: ["SHA1", "SHA256", "SHA512"],
        default: "SHA256",
      },
    },
    oauthSettings: {
      authorizationUrl: String,
      tokenUrl: String,
      clientId: String,
      clientSecret: String,
      redirectUri: String,
      scope: [String],
    },
    attributeMapping: {
      email: { type: String, default: "email" },
      firstName: { type: String, default: "given_name" },
      lastName: { type: String, default: "family_name" },
      department: String,
      role: String,
      groups: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true },
);

export const SSOConfigModel = mongoose.model("SSOConfig", ssoConfigSchema);
