from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as f:
    requirements = [line.strip() for line in f if line.strip() and not line.startswith("#")]

setup(
    name="route-planner",
    version="1.0.0",
    author="Weweraq",
    author_email="weweraq@gmail.com",
    description="A route planning application using Google Maps API",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Weweraq/Windsurf-trasy",
    packages=find_packages(),
    include_package_data=True,
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "route-planner=app:app.run",
        ],
    },
)
