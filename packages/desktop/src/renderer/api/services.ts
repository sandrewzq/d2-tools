import { createAppServices } from "@d2-tools/services/appServices";
import { api } from "./client";

export const services = createAppServices(api);
