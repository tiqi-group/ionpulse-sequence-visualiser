import c from "js-cookie";

export const Cookies = c.withAttributes({
  sameSite: "lax",
});
