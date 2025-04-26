import React, { useState } from "react";
import "./HeaderMenu.css";

/**
 * Base header menu option with all the stuff an option can have.
 * 
 * NOTE: You should not create an option with all these fields set as the result will be ugly.
 */
export type BaseHeaderMenuOption = {
  name: string,
  hotkey?: string,
  extra?: JSX.Element,
  active?: boolean,
}

/** Header options you can have */
export type HeaderMenuOption =
  /** Simple option that's just some text you can click  */
  | BaseHeaderMenuOption & { onSelected: () => any }
  
  /** Option that is a link to some other site */
  | BaseHeaderMenuOption & { link: string }
  
  /** Option that you hover over to open another dropdown with more options */
  | BaseHeaderMenuOption & { options: HeaderMenuOption[] }

  /** This will display as a separator */
  | "---";

export interface HeaderMenuDropdownProps {
  /** Options the user can click */
  options: HeaderMenuOption[],

  /** Whether or not this dropdown is inside another one. You can ignore this */
  isSubmenu?: boolean,
}

/**
 * Dropdown for the items in the header.
 * 
 * @example
 * // A single clickable option that says "hey click me" and shows the hotkey "Ctrl+S"
 * const options = [
 *  { name: "hey click me", hotkey: "Ctrl+S", onSelected: ... },
 * ];
 * 
 * @example
 * // Multiple clickable options, one has a submenu.
 * const options = [
 *  { name: "hey click me", onSelected: ... },
 *  {
 *    name: "hover me",
 *    options: [{ name: "suboption" } ]},
 *  },
 * ];
 * 
 * @example
 * // Link option to another site.
 * const options = [
 *  { name: "hey", link: "google.com" }
 * ];
 */
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
    <ul
      className={"header-menu-dropdown" + (isSubmenu ? " header-submenu" : "")}
      role="menu"
    >
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
              role={"active" in option ? "menuitemcheckbox" : "menuitem"}
              aria-checked={"active" in option && option.active}
              onClick={"onSelected" in option ? option.onSelected : undefined}
              onMouseEnter={() => handleOptionMouseEnter(option)}
              onMouseLeave={() => handleOptionMouseLeave(option)}
            >
              {"link" in option
                ? <a href={option.link} target="_blank" rel="noreferrer">{option.name}</a>
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