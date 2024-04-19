/* eslint @typescript-eslint/no-explicit-any: 0 */
/* eslint @typescript-eslint/camelcase: 0 */
/* eslint @typescript-eslint/ban-ts-ignore: 0 */

import * as core from "@actions/core";
import { context, getOctokit } from "@actions/github";
import run from "../src/update-majorver";

jest.mock("@actions/core");
jest.mock("@actions/github");

const mockedContext = jest.mocked(context, true);

describe("Update Major Version", () => {
  let updateRef: jest.Mock<any, any>;
  let createRef: jest.Mock<any, any>;

  beforeEach(() => {
    jest.spyOn(core, "getInput").mockReturnValueOnce("mygithubtoken");
    context.ref = "refs/tags/v1.2.3";
    // @ts-ignore
    mockedContext.repo = { owner: "nowactions", repo: "update-majorver" };
    context.payload = { head_commit: { id: "commit_sha" } };

    updateRef = jest.fn();
    createRef = jest.fn();
  });

  test("Create a new major tag", async () => {
    const github = {
      git: {
        getRef: async (): Promise<void> => {
          throw "error";
        },
        createRef,
      },
    };

    jest.mocked(getOctokit as any).mockImplementation(() => github);

    await run();

    expect(createRef).toHaveBeenCalledWith({
      owner: "nowactions",
      repo: "update-majorver",
      ref: "refs/tags/v1",
      sha: "commit_sha",
    });
  });

  test("Update an existing major tag", async () => {
    const github = {
      git: {
        getRef: async (): Promise<boolean> =>
          new Promise<boolean>((resolve) => resolve(true)),
        updateRef,
      },
    };
    jest.mocked(getOctokit as any).mockImplementation(() => github);

    await run();

    expect(updateRef).toHaveBeenCalledWith({
      owner: "nowactions",
      repo: "update-majorver",
      ref: "refs/tags/v1",
      sha: "commit_sha",
      force: true,
    });
  });

  test("Fails", async () => {
    const github = {
      git: {
        getRef: async (): Promise<boolean> =>
          new Promise((resolve) => resolve(true)),
        updateRef: jest.fn().mockRejectedValue(new Error("error")),
      },
    };
    jest.mocked(getOctokit as any).mockImplementation(() => github);
    const spy = jest.spyOn(core, "setFailed");

    await run();

    expect(spy).toHaveBeenCalledWith("error");
  });

  test("Fails with not tag reference", async () => {
    context.ref = "refs/heads/master";
    (core as any).setFailed = jest.fn();

    await run();

    expect(core.setFailed).toHaveBeenCalledWith("ref is not a tag");
  });

  test("Fails with not semantic versioning tag", async () => {
    context.ref = "refs/tags/v1.2";
    const spy = jest.spyOn(core, "setFailed");

    await run();

    expect(spy).toHaveBeenCalledWith(
      "tags require semantic versioning format like v1.2.3 or 1.2.3"
    );
  });

  test("Support tag without 'v' prefix", async () => {
    context.ref = "refs/tags/1.2.3";

    const github = {
      git: {
        getRef: async (): Promise<void> => {
          throw "error";
        },
        createRef,
      },
    };
    jest.mocked(getOctokit as any).mockImplementation(() => github);

    await run();

    expect(createRef).toHaveBeenCalledWith({
      owner: "nowactions",
      repo: "update-majorver",
      ref: "refs/tags/v1",
      sha: "commit_sha",
    });
  });
});
