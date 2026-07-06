import type { ReactNode } from "react";
import { ProductWorkspacePage } from "../workspace/ProductWorkspace.js";
import { HomePageContentView, type HomePageViewProps } from "./HomePageContentView.js";

export function HomePageView(props: HomePageViewProps & { children?: ReactNode }) {
  if (!props.state && props.children) {
    return (
      <ProductWorkspacePage element="div" className="home-page-preview">
        {props.children}
      </ProductWorkspacePage>
    );
  }

  return (
    <ProductWorkspacePage element="div" className="home-page-preview">
      <HomePageContentView {...props} />
    </ProductWorkspacePage>
  );
}

export type { HomePageViewProps };
