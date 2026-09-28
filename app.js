// app.js

Module.preRun = () => {
    FS.mkdir('/data');
    FS.mount(IDBFS, {}, '/data');
};

Module.onRuntimeInitialized = () => {
    console.log("WebAssembly Database Engine Loaded successfully!");

    const saveButton = document.getElementById("saveBtn");
    const statusText = document.getElementById("status");
    const recordList = document.getElementById("recordList");
    const viewButton = document.getElementById("viewBtn");

    // Load permanent files into memory on startup
    FS.syncfs(true, (err) => {
        if (err) console.error("Error loading database files from storage:", err);
        else updateRecordDisplay();
    });

    function saveToFile(filename, contents) {
        // Create blob
        const blob = new Blob([contents], {type: "text/plain;charset=utf-8"});
        const url = URL.createObjectURL(blob);

        // Temp element
        const a = document.createElement('a');

        a.href = url;
        a.download = filename;

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function updateRecordDisplay() {
        recordList.innerHTML = "";

        const year = parseInt(document.getElementById("yearToday").value) || 2026;
        const month = parseInt(document.getElementById("monthToday").value) || 9;
        const day = parseInt(document.getElementById("dayToday").value) || 25;
        const grade = parseInt(document.getElementById("gradeToday").value) || 10;

        const expectedFilePath = `/data/${day}_${month}_${year}_${grade}th_new.db`;

        try {
            const fileExists = FS.analyzePath(expectedFilePath).exists;
            if (!fileExists) {
                console.log("No database file found yet for this target selection.");
                return;
            }
        } catch(e) {
            return;
        }

        try {
            let dbTable = Module.openAttendanceDb(day, month, year, grade);
            let names = dbTable.ids;
            let attendanceStatuses = dbTable.values;

            // Make sure the C++ vectors exist before reading
            if (names && names.size) {
                for (let i = 0; i < names.size(); i++) {
                    const listItem = document.createElement("li");
                    const status = attendanceStatuses.get(i) ? "Present" : "Absent";
                    listItem.innerText = `${day}/${month}/${year} — ${grade}th — ${names.get(i)} — ${status}`;
                    recordList.appendChild(listItem);
                }
            }
            dbTable.delete();
        } catch (error) {
            console.error("View Render Exception:", error);
        }
    }

    const clearButton = document.getElementById("clearScreen");
    if (clearButton) {
        clearButton.addEventListener("click", () => {
            recordList.innerHTML = "";

            const nameInput = document.getElementById("studentName");
            if (nameInput) {
                nameInput.value = "";
            }

            if (statusText) {
                statusText.innerText = "";
            }
        });
    }

    saveButton.addEventListener("click", () => {
        const nameInput = document.getElementById("studentName");
        const name = nameInput.value;
        const isPresent = document.getElementById("isPresent").checked;

        if (!name) {
            statusText.style.color = "red";
            statusText.innerText = "Please enter a name.";
            return;
        }

        try {
            const year = parseInt(document.getElementById("yearToday").value);
            const month = parseInt(document.getElementById("monthToday").value);
            const day = parseInt(document.getElementById("dayToday").value);
            const grade = parseInt(document.getElementById("gradeToday").value);

            let dbTable = Module.openAttendanceDb(day, month, year, grade);
            let success = Module.addStudentRecord(day, month, year, grade, name, isPresent, dbTable);

            if (success) {
                statusText.style.color = "green";
                statusText.innerText = `Successfully saved ${name}!`;
                nameInput.value = "";

                // Flush virtual memory files down to permanent IndexedDB storage
                FS.syncfs(false, (err) => {
                    if (err) console.error("Disk write failure:", err);
                });

                updateRecordDisplay();
            } else {
                statusText.style.color = "red";
                statusText.innerText = "Failed to write record.";
            }
            dbTable.delete();
        } catch (error) {
            console.error(error);
            statusText.style.color = "red";
            statusText.innerText = "Attendance crashed, please try again.";
        }
    });

    if (viewButton) {
        viewButton.addEventListener("click", updateRecordDisplay);
    }

    const exportButton = document.getElementById("csvBtn");
    if (exportButton) {
        exportButton.addEventListener("click", () => {
            try {
                const year = parseInt(document.getElementById("yearToday").value);
                const month = parseInt(document.getElementById("monthToday").value);
                const day = parseInt(document.getElementById("dayToday").value);
                const grade = parseInt(document.getElementById("gradeToday").value);

                let dbTable = Module.openAttendanceDb(day, month, year, grade);
                let names = dbTable.ids;
                let attendanceStatuses = dbTable.values;

                let csvContent = "Name,Attendance\n";

                for (let i = 0; i < names.size(); i++) {
                    const status = attendanceStatuses.get(i) ? "Present" : "Absent";
                    csvContent += `${names.get(i)},${status}\n`;
                }


                dbTable.delete();

                const filename = `${day}_${month}_${year}_${grade}th_new.csv`;

                saveToFile(filename, csvContent);
            } catch (error) {
                console.error(error);
                statusText.style.color = "red";
                statusText.innerText = "Could not save to CSV. Please try again";
            }
        });
    }
};
