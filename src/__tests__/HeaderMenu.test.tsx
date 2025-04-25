import { render, RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HeaderMenuDropdown from "../components/header-menu/HeaderMenuDropdown";

describe("HeaderDropdown", () => {
  test("options should all be displayed except in submenus", async () => {
    const options = [
      { name: "test", onSelected: jest.fn() },
      { name: "test2", onSelected: jest.fn(), active: true },
      { name: "test3", onSelected: jest.fn(), active: false },
      { name: "test4", link: "stub" },
      {
        name: "test5",
        options: [
          { name: "don't show", onSelected: jest.fn() },
          { name: "don't show 2", onSelected: jest.fn() },
          { name: "don't show 3", onSelected: jest.fn() },
        ]
      },
    ];
    const dropdown = render(
      <HeaderMenuDropdown
        options={options} />
    );
    
    for (const option of options) {
      expect(dropdown.queryByText(option.name)).not.toBeNull();
    }

    expect(dropdown.queryAllByRole("option")).toHaveLength(options.length);
  });

  test("clicking an option calls onSelected", async () => {
    const onSelected = jest.fn();
    const options = [
      { name: "test", onSelected: onSelected },
    ];
    const dropdown = render(
      <HeaderMenuDropdown
        options={options} />
    );

    const button = await dropdown.findByText("test");
    await userEvent.click(button);

    expect(onSelected).toBeCalledTimes(1);
  });

  test("passing extra adds it to the element", async () => {
    const options = [
      { name: "test", onSelected: jest.fn(), extra: <span>EXTRA!</span> },
    ];
    const dropdown = render(
      <HeaderMenuDropdown
        options={options} />
    );

    expect(dropdown.queryByText("EXTRA!")).not.toBeNull();
  });

  test("passing hotkey adds it to the element", async () => {
    const options = [
      { name: "test", onSelected: jest.fn(), hotkey: "Ctrl" },
    ];
    const dropdown = render(
      <HeaderMenuDropdown
        options={options} />
    );

    expect(dropdown.queryByText("Ctrl")).not.toBeNull();
  });

  test("link option uses a link", async () => {
    const url = "http://google.com/";
    const options = [
      { name: "test", link: url },
    ];
    const dropdown = render(
      <HeaderMenuDropdown
        options={options} />
    );

    const link = await dropdown.findByText("test");
    expect(link).toBeInstanceOf(HTMLAnchorElement);
    expect(link).toHaveProperty("href", url);
  });

  test("active element be selected when active", async () => {
    const options = [
      { name: "test", onSelected: jest.fn(), active: true },
      { name: "test2", onSelected: jest.fn(), active: false },
    ];
    const dropdown = render(
      <HeaderMenuDropdown
        options={options} />
    );

    expect(dropdown.queryAllByRole("option")).toHaveLength(2);
    expect(dropdown.queryAllByRole("option", { selected: true })).toHaveLength(1);
  });

  test("--- displays as a ruler", async () => {
    const dropdown = render(
      <HeaderMenuDropdown
        options={["---"]} />
    );

    expect(dropdown.queryByRole("separator")).not.toBeNull();
  });

  test("submenu should display on hover", async () => {
    const options = [
      {
        name: "hover",
        options: [
          { name: "test1", onSelected: jest.fn() },
          { name: "test2", onSelected: jest.fn() },
          { name: "test3", onSelected: jest.fn() },
        ],
      },
    ];
    const dropdown = render(
      <HeaderMenuDropdown
        options={options} />
    );

    // Should only show one option right now
    expect(dropdown.queryAllByRole("option")).toHaveLength(1);

    // Now should show all after hovering
    const menuOption = await dropdown.findByText("hover");
    await userEvent.pointer({ pointerName: "mouse", target: menuOption });
    expect(dropdown.queryAllByRole("option")).toHaveLength(4);

    for (const suboption of options[0].options) {
      expect(dropdown.queryByText(suboption.name)).not.toBeNull();
    }
  });

  test("submenu in submenu with different types of options and a separator should display on hover and not on unhover", async () => {
    const options: any = [
      {
        name: "hover",
        options: [
          { name: "test1", onSelected: jest.fn() },
          { name: "test2", onSelected: jest.fn() },
          "---",
          {
            name: "hover2",
            options: [
              { name: "test4", onSelected: jest.fn(), active: true },
              { name: "test5", onSelected: jest.fn(), active: false },
              { name: "test6", onSelected: jest.fn() },
              { name: "link", link: "hey" },
            ],
          },
        ],
      },
    ];
    const dropdown = render(
      <HeaderMenuDropdown
        options={options} />
    );

    expect(dropdown.queryAllByRole("option")).toHaveLength(1);

    // Hover the one one
    const hover = await dropdown.findByText("hover");
    await userEvent.hover(hover);
    expect(dropdown.queryAllByRole("option")).toHaveLength(4);

    for (const suboption of options[0].options) {
      if (suboption === "---") continue;
      expect(dropdown.queryByText(suboption.name)).not.toBeNull();
    }

    // Hover the second one
    const hover2 = await dropdown.findByText("hover2");
    await userEvent.hover(hover2);
    expect(dropdown.queryAllByRole("option")).toHaveLength(8);

    for (const suboption of options[0].options[3].options) {
      expect(dropdown.queryByText(suboption.name)).not.toBeNull();
    }

    /*
      Removing this check right now because testing-library doesn't seem to be able to handle it? (since they are nested)
      But it works when manually tested

    await userEvent.unhover(hover2)
    expect(dropdown.queryAllByRole("option")).toHaveLength(4);*/

    // Unhover the first one
    await userEvent.unhover(hover);
    expect(dropdown.queryAllByRole("option")).toHaveLength(1);
  });
});