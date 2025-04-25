import React, { useState } from "react";
import "./HeaderMenu.css";

export interface BaseHeaderMenuOption {
  /** Name of the option which will be the text that apppears. */
  name: string,
  /** An extra element you can attach inline with the text */
  extra?: JSX.Element,
}

/** A single option that can be selected. */
export interface SimpleHeaderMenuOption extends BaseHeaderMenuOption {
  onSelected: () => any,
  hotkey?: string,
}

/** An option that is a link to some other thing */
export interface LinkHeaderMenuOption extends BaseHeaderMenuOption {
  link: string,
}

/**
 * An option that can be "active" as with the color settings.
 * A checkmark will appear when `active` is true.
 */
export interface ActiveHeaderMenuOption extends SimpleHeaderMenuOption {
  active: boolean,
}

/**
 * An option that contains more options (a submenu).
 * These cannot be selected, but the options inside them can be
 */
export interface GroupedHeaderMenuOption extends BaseHeaderMenuOption {
  options: HeaderMenuOption[],
}

export type HeaderMenuOption =
  | SimpleHeaderMenuOption
  | LinkHeaderMenuOption
  | ActiveHeaderMenuOption
  | GroupedHeaderMenuOption
  /** This will display as a separator */
  | "---";

export interface HeaderMenuDropdownProps {
  /** Options the user can click */
  options: HeaderMenuOption[],
  /** Whether or not this dropdown is inside another one */
  isSubmenu?: boolean,
}

const HeaderMenuDropdown: React.FC<HeaderMenuDropdownProps> = ({
  options,
  isSubmenu,
}) => {
  const [visibleDropdown, setVisibleDropdown] = useState("");

  const handleOptionMouseEnter = (option: Exclude<HeaderMenuOption, "---">) => {
    if ("options" in option) {
      setVisibleDropdown(option.name);
    }
  };

  const handleOptionMouseLeave = (option: Exclude<HeaderMenuOption, "---">) => {
    if (visibleDropdown === option.name) {
      setVisibleDropdown("");
    }
  };

  return (
    <ul className={"header-menu-dropdown" + (isSubmenu ? " header-submenu" : "")}>
      {options.map((option, index) => {
        if (option === "---") {
          return <hr key={index} />;
        } else {
          return (
            <li
              key={index}
              className={
                "header-menu-dropdown-button"
                + ("active" in option ? (option.active ? " option-active" : " option-inactive") : "")
              }
              role="option"
              aria-selected={"active" in option && option.active}
              onClick={"onSelected" in option ? option.onSelected : undefined}
              onMouseEnter={() => handleOptionMouseEnter(option)}
              onMouseLeave={() => handleOptionMouseLeave(option)}
            >
              {"link" in option
                ? <a href={option.link} target="_blank" rel="noreferrer"> {option.name}</a>
                : <span className="header-menu-dropdown-main-text">{option.name}</span>}

              {"options" in option &&
                <div className="header-dropdown-arrow-icon">&#9658;</div>}

              {"hotkey" in option &&
                <span className="header-menu-dropdown-hotkey-text">{option.hotkey}</span>}

              {option.extra}

              {visibleDropdown === option.name && "options" in option &&
                <HeaderMenuDropdown
                  options={option.options}
                  isSubmenu={true}
                />}
            </li>
          );
        }
      })}
    </ul>
  );
};

export default HeaderMenuDropdown;