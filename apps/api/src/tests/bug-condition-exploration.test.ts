/**
 * Bug Condition Exploration Test
 * 
 * Property 1: Bug Condition - Mock/Hardcoded Data in 5 Remaining Defect Categories
 * 
 * This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 * 
 * Validates: Requirements 1.8, 1.9, 1.10, 1.11, 1.19, 1.20, 1.21, 1.22
 */

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";

// Import the buggy modules directly (no mocking - we test real behavior)
import { processVideoFrame } from "../lib/videoProctoring";
import { analyzeMultimodal } from "../lib/multimodalAI";
import {
  createCollabSession,
  joinCollabSession,
  updateDocument,
  getSession,
} from "../lib/collaborativeEditor";
import {
  createWhiteboardSession,
  addElement,
  getWhiteboardElements,
} from "../lib/whiteboard";
import {
  createVideoSession,
  getSessionInfo,
} from "../lib/videoCall";

// Suppress Groq API calls in tests (no real API key)
delete process.env.GROQ_API_KEY;

describe("Bug Condition Exploration: Mock/Hardcoded Data in 5 Defect Categories", () => {
  /**
   * **Validates: Requirements 1.8**
   * 
   * Property: analyzeFace returns ML-derived coordinates that VARY with input,
   * NOT always the static position {x: 0.5, y: 0.3, z: 0}.
   * 
   * Expected to FAIL on unfixed code because the entropy heuristic always returns
   * the same static position regardless of actual frame content.
   */
  describe("Video Proctoring - Face Detection", () => {
    it("analyzeFace should return positions that vary with different inputs (NOT static {0.5, 0.3, 0})", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 600, maxLength: 2000 }),
          fc.string({ minLength: 600, maxLength: 2000 }),
          async (frameData1, frameData2) => {
            // Only test when inputs are meaningfully different
            fc.pre(frameData1 !== frameData2);
            fc.pre(frameData1.length > 500 && frameData2.length > 500);

            const result1 = await processVideoFrame(frameData1);
            const result2 = await processVideoFrame(frameData2);

            // If both detect a face, positions should NOT always be identical static values
            if (result1.faceDetection.present && result2.faceDetection.present) {
              const pos1 = result1.faceDetection.position;
              const pos2 = result2.faceDetection.position;

              // The bug: position is ALWAYS {x: 0.5, y: 0.3, z: 0} regardless of input
              // Expected behavior: ML-derived coordinates that vary with input
              const bothStatic =
                pos1.x === 0.5 && pos1.y === 0.3 && pos1.z === 0 &&
                pos2.x === 0.5 && pos2.y === 0.3 && pos2.z === 0;

              // This assertion should PASS after fix (positions vary)
              // It will FAIL on unfixed code (positions are always static)
              expect(bothStatic).toBe(false);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * **Validates: Requirements 1.9**
   * 
   * Property: analyzeEyeMovement returns values that vary with input,
   * NOT static gazeDirection='screen', blinkRate=15, eyeContactPercentage=85.
   * 
   * Expected to FAIL on unfixed code because the heuristic uses position deltas
   * that don't reflect actual eye tracking from ML models.
   */
  describe("Video Proctoring - Eye Tracking", () => {
    it("eye tracking should derive values from ML analysis, not position-delta heuristics", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 600, maxLength: 2000 }),
          async (frameData) => {
            // Call with no previous positions (simulating first frame)
            // The bug: with face present but no previous positions, returns static defaults
            // With previous positions, it uses simple delta math, not ML
            const result = await processVideoFrame(frameData, [
              { x: 0.5, y: 0.3 },
              { x: 0.5, y: 0.3 },
            ]);

            if (result.faceDetection.present) {
              // When previous positions are identical (no movement), the heuristic
              // always returns: gazeDirection='screen', blinkRate=15, eyeContactPercentage=100
              // Real ML eye tracking should analyze the actual frame content
              const isStaticDefault =
                result.eyeTracking.gazeDirection === "screen" &&
                result.eyeTracking.blinkRate === 15 &&
                result.eyeTracking.eyeContactPercentage === 100;

              // This should PASS after fix (ML-derived values vary)
              // It will FAIL on unfixed code (static heuristic values)
              expect(isStaticDefault).toBe(false);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * **Validates: Requirements 1.10**
   * 
   * Property: analyzeExpressions returns distributions that vary meaningfully
   * across different inputs, NOT near-static values.
   * 
   * Expected to FAIL on unfixed code because the entropy-based heuristic produces
   * near-identical distributions for different inputs.
   */
  describe("Video Proctoring - Expression Analysis", () => {
    it("expressions should vary meaningfully across different inputs (NOT near-static)", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate frame data WITHOUT expression keywords to test pure entropy path
          fc.string({ minLength: 600, maxLength: 2000 }).filter(
            s => !s.includes("smile") && !s.includes("happy") &&
                 !s.includes("surprise") && !s.includes("confused") &&
                 !s.includes("nervous") && !s.includes("angry") &&
                 !s.includes("shock") && !s.includes("frown") &&
                 !s.includes("anxious")
          ),
          fc.string({ minLength: 600, maxLength: 2000 }).filter(
            s => !s.includes("smile") && !s.includes("happy") &&
                 !s.includes("surprise") && !s.includes("confused") &&
                 !s.includes("nervous") && !s.includes("angry") &&
                 !s.includes("shock") && !s.includes("frown") &&
                 !s.includes("anxious")
          ),
          async (frameData1, frameData2) => {
            fc.pre(frameData1 !== frameData2);

            const result1 = await processVideoFrame(frameData1);
            const result2 = await processVideoFrame(frameData2);

            const expr1 = result1.expressions;
            const expr2 = result2.expressions;

            // Without keywords, the entropy-based heuristic produces near-identical
            // distributions. The surprised/confused/anxious/angry values are always 0.05
            // and only neutral varies slightly based on entropy.
            // Real ML should produce meaningfully different distributions for different frames.
            const surprisedSame = Math.abs(expr1.surprised - expr2.surprised) < 0.001;
            const confusedSame = Math.abs(expr1.confused - expr2.confused) < 0.001;
            const anxiousSame = Math.abs(expr1.anxious - expr2.anxious) < 0.001;
            const angrySame = Math.abs(expr1.angry - expr2.angry) < 0.001;

            // If all non-neutral expressions are essentially identical for different inputs,
            // the system is using static heuristics, not ML
            const allNonNeutralStatic = surprisedSame && confusedSame && anxiousSame && angrySame;

            // This should PASS after fix (ML produces varied distributions)
            // It will FAIL on unfixed code (static values for non-neutral expressions)
            expect(allNonNeutralStatic).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * **Validates: Requirements 1.22**
   * 
   * Property: analyzeVoiceTone returns Groq-derived scores as primary analysis,
   * NOT keyword-counting-only results.
   * 
   * Expected to FAIL on unfixed code because without GROQ_API_KEY, the function
   * falls back to pure keyword counting with no source indicator.
   */
  describe("Multimodal Voice Tone Analysis", () => {
    it("voice tone should use Groq as primary (or flag heuristic_fallback), NOT keyword-only", async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate text without any confidence/nervousness/enthusiasm keywords
          fc.string({ minLength: 30, maxLength: 200 }).filter(
            s => !s.toLowerCase().includes("definitely") &&
                 !s.toLowerCase().includes("certainly") &&
                 !s.toLowerCase().includes("sure") &&
                 !s.toLowerCase().includes("absolutely") &&
                 !s.toLowerCase().includes("um") &&
                 !s.toLowerCase().includes("uh") &&
                 !s.toLowerCase().includes("like") &&
                 !s.toLowerCase().includes("maybe") &&
                 !s.toLowerCase().includes("great") &&
                 !s.toLowerCase().includes("excited") &&
                 !s.toLowerCase().includes("love") &&
                 !s.toLowerCase().includes("awesome") &&
                 !s.toLowerCase().includes("amazing")
          ),
          async (text) => {
            const result = await analyzeMultimodal(text);
            const voice = result.voice;

            // Without keywords and without Groq, the function returns default values:
            // confidence=50, nervousness=20, enthusiasm=50
            // The expected behavior is either:
            // 1. Groq-derived scores (varying with input), OR
            // 2. A clearly-flagged heuristic fallback with source: "heuristic_fallback"
            const isDefaultKeywordResult =
              voice.confidence === 50 &&
              voice.nervousness === 20 &&
              voice.enthusiasm === 50;

            // Check if result has a source flag indicating fallback
            const hasSourceFlag = (voice as any).source === "heuristic_fallback";

            // Either the result should NOT be the default keyword values,
            // OR it should be clearly flagged as a heuristic fallback
            // This will FAIL on unfixed code (returns defaults with no flag)
            expect(isDefaultKeywordResult && !hasSourceFlag).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * **Validates: Requirements 1.19**
   * 
   * Property: Two concurrent updateDocument calls preserve both changes
   * (CRDT merge), NOT last-write-wins.
   * 
   * Expected to FAIL on unfixed code because updateDocument simply overwrites
   * the entire document string.
   */
  describe("Collaborative Editor - Concurrent Edits", () => {
    it("concurrent edits should be merged (CRDT), NOT last-write-wins", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (edit1, edit2) => {
            fc.pre(edit1 !== edit2);
            fc.pre(edit1.length > 0 && edit2.length > 0);

            // Create a session with initial document
            const sessionId = createCollabSession("room1", "user1", "User One");
            joinCollabSession(sessionId, "user2", "User Two");

            // Set initial document
            updateDocument(sessionId, "initial content", "user1");

            // Simulate concurrent edits: both users edit at the "same time"
            // User 1 appends their edit
            const user1Edit = "initial content" + edit1;
            // User 2 appends their edit (based on same original)
            const user2Edit = "initial content" + edit2;

            // Apply both edits (simulating concurrency)
            updateDocument(sessionId, user1Edit, "user1");
            updateDocument(sessionId, user2Edit, "user2");

            // Get final document state
            const session = getSession(sessionId);
            const finalDoc = session?.document || "";

            // With CRDT, both edits should be preserved in the final document
            // With last-write-wins, only user2's edit survives
            const containsEdit1 = finalDoc.includes(edit1);
            const containsEdit2 = finalDoc.includes(edit2);

            // This should PASS after fix (CRDT merges both)
            // It will FAIL on unfixed code (last write wins - only edit2 preserved)
            expect(containsEdit1 && containsEdit2).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * **Validates: Requirements 1.20**
   * 
   * Property: addElement persists to database and survives session recreation
   * (MongoDB persistence), NOT in-memory-only.
   * 
   * Expected to FAIL on unfixed code because elements are stored in an in-memory
   * Map that is lost when the session is deleted/recreated.
   */
  describe("Whiteboard - Persistence", () => {
    it("whiteboard elements should persist across session recreation (NOT in-memory-only)", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.constantFrom("line", "rectangle", "circle", "text", "arrow", "freehand") as fc.Arbitrary<"line" | "rectangle" | "circle" | "text" | "arrow" | "freehand">,
            strokeColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
            strokeWidth: fc.integer({ min: 1, max: 10 }),
            createdBy: fc.string({ minLength: 3, maxLength: 10 }),
            startPoint: fc.record({ x: fc.integer({ min: 0, max: 1000 }), y: fc.integer({ min: 0, max: 1000 }) }),
            endPoint: fc.record({ x: fc.integer({ min: 0, max: 1000 }), y: fc.integer({ min: 0, max: 1000 }) }),
          }),
          async (elementData) => {
            const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2)}`;

            const sessionId1 = await createWhiteboardSession(roomId);
            const added = await addElement(sessionId1, elementData);
            expect(added).not.toBeNull();

            const elementsBeforeRecreation = await getWhiteboardElements(sessionId1);
            expect(elementsBeforeRecreation.length).toBeGreaterThan(0);

            const sessionId2 = await createWhiteboardSession(roomId);
            const elementsAfterRecreation = await getWhiteboardElements(sessionId2);

            expect(elementsAfterRecreation.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * **Validates: Requirements 1.21**
   * 
   * Property: createVideoSession provides ICE server configuration
   * (STUN/TURN URLs), NOT empty/missing configuration.
   * 
   * Expected to FAIL on unfixed code because the video call module has no
   * STUN/TURN server integration.
   */
  describe("Video Call - ICE Server Configuration", () => {
    it("video session should provide ICE server configuration (STUN/TURN URLs)", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 3, maxLength: 20 }),
          fc.string({ minLength: 3, maxLength: 20 }),
          fc.string({ minLength: 3, maxLength: 20 }),
          async (roomId, hostId, hostName) => {
            const sessionId = await createVideoSession(roomId, hostId, hostName);

            // Get session info - should include ICE server configuration
            const sessionInfo = getSessionInfo(sessionId) as any;

            // Expected behavior: session provides ICE servers (STUN/TURN URLs)
            // for WebRTC peer connection setup
            const hasIceServers = sessionInfo?.iceServers &&
              Array.isArray(sessionInfo.iceServers) &&
              sessionInfo.iceServers.length > 0;

            const hasStunOrTurn = hasIceServers && sessionInfo.iceServers.some(
              (server: any) => server.urls &&
                (server.urls.includes("stun:") || server.urls.includes("turn:"))
            );

            // This should PASS after fix (ICE servers configured)
            // It will FAIL on unfixed code (no ICE server config in response)
            expect(hasStunOrTurn).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
