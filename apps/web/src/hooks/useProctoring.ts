import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

export function useProctoring(isActive: boolean) {
  const [violationCount, setViolationCount] = useState(0);
  const [lastViolation, setLastViolation] = useState<string>("");

  // Helper function to handle violations
  const triggerViolation = useCallback(
    (reason: string) => {
      if (!isActive) return;

      // Duplicate warnings rokne ke liye (e.g. Tab switch karte hi Blur bhi fire hota hai)
      setLastViolation(reason);
      setViolationCount((prev) => {
        const newCount = prev + 1;

        // Toast Notification logic
        if (newCount <= 3) {
          toast.warning(`⚠️ Warning ${newCount}/3: ${reason}`, {
            description: "Please stay on the interview screen.",
            duration: 4000,
          });
        } else {
          toast.error(`🚫 Violation Limit Reached!`, {
            description: "This activity has been flagged to the recruiter.",
            duration: 5000,
          });
        }
        return newCount;
      });
    },
    [isActive],
  );

  useEffect(() => {
    if (!isActive) return;

    // 1. Tab Switch Detection (User dusre tab me gaya)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation("Tab Switch Detected");
      }
    };

    // 2. Window Blur (User ne browser minimize kiya ya dusri app kholi)
    const handleBlur = () => {
      triggerViolation("Window Focus Lost");
    };

    // 3. Mouse Leave (User ka mouse browser se bahar gaya)
    const handleMouseLeave = () => {
      // Thoda strict hai, isliye sirf count badhayenge, toast spam nahi karenge
      // triggerViolation("Mouse Left Window");
    };

    // Listeners attach karo
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.body.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.body.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isActive, triggerViolation]);

  return { violationCount, lastViolation };
}
