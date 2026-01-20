/* ---------------------------------------------
 Collapse Box Functionality
--------------------------------------------- */
const collapseBoxTitle   = document.querySelectorAll(".collapse-box-title");
const collapseBoxContent = document.querySelectorAll(".collapse-box-content");
const collapseBoxArrow   = document.querySelectorAll(".down-arrow");

// Add event listeners to all collapse boxes
for (let i = 0; i < collapseBoxTitle.length; i++) {
    collapseBoxTitle[i].addEventListener("click", () => {
        const isOpen = collapseBoxContent[i].style.maxHeight;

        if (isOpen) {
            collapseBoxContent[i].style.maxHeight  = null;
            collapseBoxContent[i].style.paddingBottom = "0";
            collapseBoxArrow[i].classList.remove("open");
        } else {
            collapseBoxContent[i].style.maxHeight = collapseBoxContent[i].scrollHeight + "px";
            collapseBoxContent[i].style.paddingBottom = "12px";
            collapseBoxArrow[i].classList.add("open");
        }
    });
}

fetch("solutions/test.py")
    .then(response => response.text())
    .then(code => {
        document.getElementById('code-block').textContent = code;
        Prism.highlightAll();
    })
    .catch(error => {
        document.getElementById('code-block').textContent = "Error loading solution";
    });