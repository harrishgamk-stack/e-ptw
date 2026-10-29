import type { Page } from "@playwright/test";
import { demoPeople } from "../weekly-fixture";
export async function hseSession(page: Page) {
  await page.addInitScript(
    (person) => {
      if (!localStorage.getItem("pcg-weekly-v2"))
        localStorage.setItem(
          "pcg-weekly-v2",
          JSON.stringify({
            schema: 2,
            people: [person],
            permits: [],
            audit: [],
          }),
        );
      sessionStorage.setItem("pcg-weekly-person", person.id);
    },
    demoPeople.find((p) => p.role === "HSE")!,
  );
}
