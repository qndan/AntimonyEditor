import { useState } from "react";
import { render, RenderResult } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import FileExplorer, { FileExplorerProps } from "../components/file-explorer/FileExplorer";

describe("FileExplorer", () => {
    /**
     * We have to create a container for the file explorer so we can use `useState` to mock the files.
     * The only required field is initialFiles to represent the initial files the tree will contain.
     * Additional props can be provided to pass down directly to the file explorer.
     * 
     * @param props.initialFiles - Initial files the tree will be populated with.
     * @param props.initialSelectedIndex - Initial file index that will be selected.
     */
    const FileExplorerMockContainer = (
        props: {
            initialFiles: FileExplorerProps["files"],
            initialSelectedIndex?: number,
        } & Partial<FileExplorerProps>
    ) => {
        const [files, setFiles] = useState(props.initialFiles);
        const [selectedFileIndex, setSelectedFileIndex] = useState(props.initialSelectedIndex ?? null);
        const [selectedFileName, setSelectedFileName] = useState(files[selectedFileIndex ?? 0]?.name);

        const mockDatabase = {
            transaction: () => ({
                objectStore: () => ({
                    get: (name: string) => Promise.resolve(files.find(f => f.name == name)),
                }),
            }),
        };

        return (
            <FileExplorer
                database={mockDatabase as any}
                files={files}
                setFiles={setFiles}
                onFileClick={jest.fn()}
                onDeleteFile={jest.fn()}
                handleNewFile={jest.fn()}
                selectedFileIndex={selectedFileIndex}
                setSelectedFileIndex={setSelectedFileIndex}
                selectedFileName={selectedFileName}
                setSelectedFileName={setSelectedFileName}
                {...props}
            />
        );
    };

    test("multiple files should appear in the tree", async () => {
        const files = [
            { name: "test1", content: "hey" },
            { name: "test2", content: "hey" },
            { name: "test3", content: "hey" },
            { name: "test4", content: "hey" },
            { name: "test5", content: "hey" },
        ];

        const explorer = render(
            <FileExplorerMockContainer
                initialFiles={files}
            />
        );

        // All the files should appear
        for (let file of files) {
            const fileButton = await explorer.findByText(file.name);
            expect(fileButton).toBeInstanceOf(HTMLButtonElement);
        }
    });

    test("empty file tree should have no buttons", async () => {
        const files: any = [];

        const explorer = render(
            <FileExplorerMockContainer
                initialFiles={files}
            />
        );

        // There should be no buttons because there are no files
        expect(explorer.queryByRole("button")).toBeNull();
    });

    test("right clicking a file should select it", async () => {
        const files = [
            { name: "test1", content: "hey" },
            { name: "test2", content: "hey" },
            { name: "test3", content: "hey" },
            { name: "test4", content: "hey" },
            { name: "test5", content: "hey" },
        ];

        const mockSetSelectedFileIndex = jest.fn();
        const explorer = render(
            <FileExplorerMockContainer
                initialFiles={files}
                setSelectedFileIndex={mockSetSelectedFileIndex}
            />
        );

        for (let file of files) {
            const fileButton = await explorer.findByText(file.name);
            expect(fileButton).toBeInstanceOf(HTMLButtonElement);
            await userEvent.pointer({ keys: "[MouseRight]", target: fileButton });
        }

        expect(mockSetSelectedFileIndex.mock.calls).toHaveLength(files.length);
        for (let [index, call] of mockSetSelectedFileIndex.mock.calls.entries()) {
            // Should've selected the files in sequence
            expect(call).toEqual([index]);
        }
    });

    test("clicking a file should fire onFileClick", async () => {
        const files = [
            { name: "hello world", content: "goodbye world" },
            { name: "hi", content: "bye"},
            { name: "abc", content: "def"},
        ];

        const mockOnClick = jest.fn();
        const explorer = render(
            <FileExplorerMockContainer
                initialFiles={files}
                onFileClick={mockOnClick}
            />
        );

        for (let file of files) {
            const fileButton = await explorer.findByText(file.name);
            expect(fileButton).toBeInstanceOf(HTMLButtonElement);
            await userEvent.click(fileButton);
        }

        expect(mockOnClick.mock.calls).toHaveLength(files.length);
        for (let [index, file] of files.entries()) {
            expect(mockOnClick.mock.calls[index][0]).toBe(file.content);
            expect(mockOnClick.mock.calls[index][1]).toBe(file.name);
            expect(mockOnClick.mock.calls[index][2]).toBe(index);
        }
    });

    test("deleting a file that comes after the selected file should not change the selected file index", async () => {
        const files = [
            { name: "file1", content: "" },
            { name: "file2", content: "" },
            { name: "file3", content: "" },
        ];

        const mockOnDelete = jest.fn();
        const mockSetSelectedFileIndex = jest.fn();
        const explorer = render(
            <FileExplorerMockContainer
                initialFiles={files}
                initialSelectedIndex={1}
                onDeleteFile={mockOnDelete}
                setSelectedFileIndex={mockSetSelectedFileIndex}
            />
        );

        // Click the button after the currently selected one
        const file2Button = await explorer.findByText(files[2].name);
        expect(file2Button).toBeInstanceOf(HTMLButtonElement);
        await userEvent.pointer({ keys: "[MouseRight]", target: file2Button });
        
        const deleteButton = await explorer.findByText("Delete");
        await userEvent.click(deleteButton);

        // Should have called it once and requested to delete the file after the currently selected one
        // The `true` means it should have requested to be deleted from the file tree.
        expect(mockOnDelete.mock.calls).toHaveLength(1);
        expect(mockOnDelete.mock.calls[0]).toEqual([files[2].name, true]);

        // The last selection change should have only been from the right click
        expect(mockSetSelectedFileIndex.mock.lastCall).toEqual([2]);
    });

    test("deleting a file that comes before the selected file should change the selected file index", async () => {
        const files = [
            { name: "file1", content: "" },
            { name: "file2", content: "" },
            { name: "file3", content: "" },
        ];

        const mockOnDelete = jest.fn();
        const mockSetSelectedFileIndex = jest.fn();
        const explorer = render(
            <FileExplorerMockContainer
                initialFiles={files}
                initialSelectedIndex={1}
                onDeleteFile={mockOnDelete}
                setSelectedFileIndex={mockSetSelectedFileIndex}
            />
        );

        // Click the button after the currently selected one
        const file0Button = await explorer.findByText(files[0].name);
        expect(file0Button).toBeInstanceOf(HTMLButtonElement);
        await userEvent.pointer({ keys: "[MouseRight]", target: file0Button });
        
        const deleteButton = await explorer.findByText("Delete");
        await userEvent.click(deleteButton);

        // Should have called it once and requested to delete the file after the currently selected one
        // The `true` means it should have requested to be deleted from the file tree.
        expect(mockOnDelete.mock.calls).toHaveLength(1);
        expect(mockOnDelete.mock.calls[0]).toEqual([files[0].name, true]);

        // Deleting the file that came before should move the current selected file one down (so zero)
        expect(mockSetSelectedFileIndex.mock.lastCall).toEqual([0]);
    });

    describe("Renaming", () => {
        /**
         * Convenience function for finding the file button in the rendered file explorer
         * and right clicking it then clicking rename.
         * @param explorer - The explorer containg all the files
         * @param fileName - The name of the file to click rename for
         * @returns - The input for renaming the file
         */
        const clickRenameFor = async (explorer: any, fileName: string): Promise<HTMLInputElement> => {
            const fileButton = await explorer.findByText(fileName);
            expect(fileButton).toBeInstanceOf(HTMLButtonElement);
            await userEvent.pointer({ keys: "[MouseRight]", target: fileButton });
            
            const renameButton = await explorer.findByText("Rename")
            await userEvent.click(renameButton);

            const fileInput = await explorer.findByDisplayValue(fileName);
            expect(fileInput).toBeInstanceOf(HTMLInputElement);
            expect(fileInput).toHaveFocus();

            return fileInput;
        }

        /**
         * Convience function to reach renaming to nothing state.
         * @param fileName - name of the single file which will appear in the tree
         * @returns - the rendered explorer
         * @returns - the rename input element
         */
        const setupRenameFileToNothing = async (fileName: string): Promise<[RenderResult, HTMLInputElement]> => {
            // Type enough to empty out the file name
            const typeThis = "[Backspace]".repeat(fileName.length);

            const explorer = render(
                <FileExplorerMockContainer
                    initialFiles={[ { name: fileName, content: "hi" } ]}
                />
            );

            const renameInput = await clickRenameFor(explorer, fileName);

            // Delete all the text so its empty
            await userEvent.keyboard(typeThis);
            expect(renameInput).toHaveValue("");
            expect(renameInput).toBeInTheDocument();

            return [explorer, renameInput];
        };

        test("pressing enter should finish the rename", async () => {
            const initialFileName = "hi click me";
            const newFileName = "hi click me 2";
            const fileContent = "hello world";
            const typeThis = " 2[Enter]"; // This is what they type to go from the initial file name to the new file name

            const explorer = render(
                <FileExplorerMockContainer
                    initialFiles={[ { name: initialFileName, content: fileContent } ]}
                />
            );

            const renameInput = await clickRenameFor(explorer, initialFileName);

            // type into the box the new name
            await userEvent.keyboard(typeThis);
            expect(renameInput).not.toBeInTheDocument();

            // the file should now be renamed
            const fileButton = await explorer.findByText(newFileName);
            expect(fileButton).toBeInstanceOf(HTMLButtonElement);
        });

        test("clicking somewhere else should finish the rename", async () => {
            const initialFileName = "hi click me";
            const newFileName = "hi click me 2";
            const typeThis = " 2";

            const explorer = render(
                <FileExplorerMockContainer
                    initialFiles={[ { name: initialFileName, content: "hello world" } ]}
                />
            );

            const renameInput = await clickRenameFor(explorer, initialFileName);

            await userEvent.keyboard(typeThis);
            expect(renameInput).toBeInTheDocument();
            await userEvent.pointer({ keys: "[MouseLeft]" });
            expect(renameInput).not.toBeInTheDocument();

            const fileButton = await explorer.findByText(newFileName);
            expect(fileButton).toBeInstanceOf(HTMLButtonElement);
        });

        test("pressing esc should cancel the rename", async () => {
            const initialFileName = "hi click me";
            const typeThis = " 2[Escape]";

            const explorer = render(
                <FileExplorerMockContainer
                    initialFiles={[ { name: initialFileName, content: "hello world" } ]}
                />
            );

            const renameInput = await clickRenameFor(explorer, initialFileName);

            await userEvent.keyboard(typeThis);
            expect(renameInput).not.toBeInTheDocument();

            const fileButton = await explorer.findByText(initialFileName);
            expect(fileButton).toBeInstanceOf(HTMLButtonElement);
        });

        test("should not be able to rename a file to nothing", async () => {
            const [explorer, _] = await setupRenameFileToNothing("hi click me");
            
            // Should not exist because they should not be allowed to rename the file to nothing
            const fileButton = explorer.queryByRole("button");
            expect(fileButton).toBeNull();
        });

        test("should not be able to rename files to the same thing", async () => {
            const initialFileName = "hi click me";
            const otherFileName = "hi click"

            // Type so they have the same name
            const typeThis = " me[Enter]";

            const explorer = render(
                <FileExplorerMockContainer
                    initialFiles={[
                        { name: initialFileName, content: "hello world" },
                        { name: otherFileName, content: "hello world" },
                    ]}
                />
            );

            const renameInput = await clickRenameFor(explorer, otherFileName);
            expect(renameInput).toBeInstanceOf(HTMLInputElement);
            expect(renameInput).toHaveFocus();

            await userEvent.keyboard(typeThis);
            expect(renameInput).toHaveValue(initialFileName);
            expect(renameInput).toHaveFocus();
            expect(renameInput).toBeInTheDocument(); // They should not have been able to submit

            // There should only be one button with the name
            const buttons = await explorer.findAllByText(initialFileName);
            expect(buttons).toHaveLength(1);
        });

        test("when there is an error while renaming, clicking somewhere else should reset to original name", async () => {
            const fileName = "hi click me";
            const [explorer, _] = await setupRenameFileToNothing(fileName);
            await userEvent.pointer({ keys: "[MouseLeft]" });
           
            // Name should've reset
            await explorer.findByText(fileName);
        });

        test("when there is an error while renaming, there should be an error message", async () => {
            const fileName = "hi click me";
            const [explorer, _] = await setupRenameFileToNothing(fileName);
           
            // Should have error message
            await explorer.findByRole("alert");
        });
    });
})