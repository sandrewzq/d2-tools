import { createAppServices } from "@d2-tools/services";
import { api } from "./client";

export const services = createAppServices(api);
