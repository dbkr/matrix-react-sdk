/*
Copyright 2022 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { PureComponent } from "react";
import { Screen as ScreenEvent } from "matrix-analytics-events/types/typescript/Screen";

import PageType from "./PageTypes";
import Views from "./Views";
import { PosthogAnalytics } from "./PosthogAnalytics";

export type ScreenName = ScreenEvent["screenName"];

const notLoggedInMap: Record<Exclude<Views, Views.LOGGED_IN>, ScreenName> = {
    [Views.LOADING]: "WebLoading",
    [Views.WELCOME]: "Welcome",
    [Views.LOGIN]: "Login",
    [Views.REGISTER]: "Register",
    [Views.FORGOT_PASSWORD]: "ForgotPassword",
    [Views.COMPLETE_SECURITY]: "WebCompleteSecurity",
    [Views.E2E_SETUP]: "WebE2ESetup",
    [Views.SOFT_LOGOUT]: "WebSoftLogout",
};

const loggedInPageTypeMap: Record<PageType, ScreenName> = {
    [PageType.HomePage]: "Home",
    [PageType.RoomView]: "Room",
    [PageType.UserView]: "User",
    [PageType.GroupView]: "Group",
    [PageType.MyGroups]: "MyGroups",
};

export default class PosthogTrackers {
    private static internalInstance: PosthogTrackers;

    public static get instance(): PosthogTrackers {
        if (!PosthogTrackers.internalInstance) {
            PosthogTrackers.internalInstance = new PosthogTrackers();
        }
        return PosthogTrackers.internalInstance;
    }

    private view: Views = Views.LOADING;
    private pageType?: PageType = null;
    private override?: ScreenName = null;

    public trackPageChange(view: Views, pageType: PageType | undefined, durationMs: number): void {
        this.view = view;
        this.pageType = pageType;
        if (this.override) return;
        this.trackPage(durationMs);
    }

    private trackPage(durationMs?: number): void {
        const screenName = this.view === Views.LOGGED_IN
            ? loggedInPageTypeMap[this.pageType]
            : notLoggedInMap[this.view];
        PosthogAnalytics.instance.trackEvent<ScreenEvent>({
            eventName: "$screen",
            screenName,
            durationMs,
        });
    }

    public trackOverride(screenName: ScreenName): void {
        if (!screenName) return;
        this.override = screenName;
        PosthogAnalytics.instance.trackEvent<ScreenEvent>({
            eventName: "$screen",
            screenName,
        });
    }

    public clearOverride(screenName: ScreenName): void {
        if (screenName !== this.override) return;
        this.override = null;
        this.trackPage();
    }
}

export class PosthogScreenTracker extends PureComponent<{ screenName: ScreenName }> {
    componentDidMount() {
        PosthogTrackers.instance.trackOverride(this.props.screenName);
    }

    componentDidUpdate() {
        // We do not clear the old override here so that we do not send the non-override screen as a transition
        PosthogTrackers.instance.trackOverride(this.props.screenName);
    }

    componentWillUnmount() {
        PosthogTrackers.instance.clearOverride(this.props.screenName);
    }

    render() {
        return null; // no need to render anything, we just need to hook into the React lifecycle
    }
}
