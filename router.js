import { UploadPage } from './pages/upload.js';
import { FilesPage } from './pages/files.js';

export function navigate(path) {
    history.pushState({}, '', path);
    router();
}

export function router() {

    const app = document.getElementById('app');
    const path = window.location.pathname;

    switch (path) {

        case '/files':
            app.innerHTML = FilesPage();
            break;

        default:
            app.innerHTML = UploadPage();
    }

    bindLinks();
}

function bindLinks() {

    document.querySelectorAll('[data-link]')
        .forEach(link => {

            link.addEventListener('click', e => {

                e.preventDefault();

                navigate(
                    link.getAttribute('href')
                );

            });

        });

}